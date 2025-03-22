import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  RefreshControl, 
  TouchableOpacity, 
  Alert,
  Image,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { getProducts, deleteProduct } from '../../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Swipeable } from 'react-native-gesture-handler';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { theme } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Product Type
interface Product {
  _id: string;
  productName: string;
  quantity: string;
  dateOfExpiry: string;
  status: 'not_expired' | 'expired' | 'consumed';
}

// Calculate days until expiry
const getDaysUntilExpiry = (expiryDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedProducts, setGroupedProducts] = useState<{
    expiringSoon: Product[];
    fresh: Product[];
    expired: Product[];
    consumed: Product[];
  }>({
    expiringSoon: [],
    fresh: [],
    expired: [],
    consumed: []
  });
  
  const [activeTab, setActiveTab] = useState<'all' | 'expiring' | 'expired'>('all');
  
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // The API expects a barcode parameter, but we pass an empty string when fetching all products
      const response = await getProducts('');
      if (response.success) {
        setProducts(response.product);
        groupProducts(response.product);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const groupProducts = (productList: Product[]) => {
    const grouped = {
      expiringSoon: [] as Product[],
      fresh: [] as Product[],
      expired: [] as Product[],
      consumed: [] as Product[]
    };

    productList.forEach(product => {
      if (product.status === 'consumed') {
        grouped.consumed.push(product);
      } else if (product.status === 'expired') {
        grouped.expired.push(product);
      } else {
        const daysUntilExpiry = getDaysUntilExpiry(product.dateOfExpiry);
        if (daysUntilExpiry <= 3 && daysUntilExpiry >= 0) {
          grouped.expiringSoon.push(product);
        } else if (daysUntilExpiry > 0) {
          grouped.fresh.push(product);
        } else {
          grouped.expired.push(product);
        }
      }
    });

    // Sort by expiry date (soonest first)
    grouped.expiringSoon.sort((a, b) => new Date(a.dateOfExpiry).getTime() - new Date(b.dateOfExpiry).getTime());
    grouped.fresh.sort((a, b) => new Date(a.dateOfExpiry).getTime() - new Date(b.dateOfExpiry).getTime());
    
    setGroupedProducts(grouped);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (productId: string) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to remove this product from your fridge?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const response = await deleteProduct(productId);
              if (response.success) {
                const updatedProducts = products.filter((product) => product._id !== productId);
                setProducts(updatedProducts);
                groupProducts(updatedProducts);
              } else {
                Alert.alert("Error", response.message);
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete product");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Since updateProductStatus is not available in the API utility yet, 
  // let's implement a simplified version that only updates the local state
  const markAsConsumed = async (productId: string) => {
    try {
      // For now, we'll just update the UI state without an API call
      // TODO: Replace this with a proper API call when the endpoint is available
      const updatedProducts = products.map(product => 
        product._id === productId 
          ? { ...product, status: 'consumed' as const } 
          : product
      );
      setProducts(updatedProducts);
      groupProducts(updatedProducts);
      
      // Give feedback to the user
      Alert.alert("Success", "Product marked as consumed");
      
    } catch (error) {
      Alert.alert("Error", "Failed to mark product as consumed");
    }
  };

  const renderSwipeableProduct = ({ item }: { item: Product }) => {
    let swipeableRef: Swipeable | null = null;
    
    const closeSwipeable = () => {
      if (swipeableRef) {
        swipeableRef.close();
      }
    };

    const renderRightActions = () => (
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.consumeButton]} 
          onPress={() => {
            markAsConsumed(item._id);
            closeSwipeable();
          }}
        >
          <IconSymbol name="house.fill" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Consumed</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => {
            handleDelete(item._id);
            closeSwipeable();
          }}
        >
          <IconSymbol name="house.fill" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );

    // Calculate days until expiry
    const daysUntilExpiry = getDaysUntilExpiry(item.dateOfExpiry);

    // Determine status label and color
    let statusColor = "#4CAF50"; // default green
    let statusLabel = "Fresh";
    
    if (item.status === 'consumed') {
      statusColor = "#9E9E9E"; // gray
      statusLabel = "Consumed";
    } else if (item.status === 'expired' || daysUntilExpiry < 0) {
      statusColor = "#F44336"; // red
      statusLabel = "Expired";
    } else if (daysUntilExpiry <= 3) {
      statusColor = "#FF9800"; // orange
      statusLabel = `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;
    } else {
      statusLabel = `Expires in ${daysUntilExpiry} days`;
    }

    return (
      <Swipeable
        ref={ref => swipeableRef = ref}
        renderRightActions={renderRightActions}
        friction={2}
        overshootRight={false}
      >
        <View style={styles.productCard}>
          <View style={styles.productIconContainer}>
            {/* Placeholder icon - would be replaced with actual food category icons */}
            <IconSymbol 
              name="house.fill" 
              size={32} 
              color={statusColor} 
            />
          </View>
          
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{item.productName}</Text>
            <Text style={styles.productQuantity}>Quantity: {item.quantity}</Text>
            <View style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          
          <View style={styles.dateContainer}>
            <Text style={styles.expiryDate}>
              {new Date(item.dateOfExpiry).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderHeader = () => {
    // Calculate the opacity for header background based on scroll position
    const headerOpacity = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.headerContainer}>
        <Animated.View 
          style={[
            styles.headerBackground, 
            { opacity: headerOpacity, paddingTop: insets.top }
          ]} 
        />
        
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <View style={styles.titleContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
            />
            <Text style={styles.title}>My Fridge</Text>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                All
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'expiring' && styles.activeTab]} 
              onPress={() => setActiveTab('expiring')}
            >
              <Text style={[styles.tabText, activeTab === 'expiring' && styles.activeTabText]}>
                Expiring Soon
              </Text>
              {groupedProducts.expiringSoon.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{groupedProducts.expiringSoon.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'expired' && styles.activeTab]} 
              onPress={() => setActiveTab('expired')}
            >
              <Text style={[styles.tabText, activeTab === 'expired' && styles.activeTabText]}>
                Expired
              </Text>
              {groupedProducts.expired.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{groupedProducts.expired.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const getFilteredProducts = () => {
    switch (activeTab) {
      case 'expiring':
        return groupedProducts.expiringSoon;
      case 'expired':
        return groupedProducts.expired;
      case 'all':
      default:
        return [...groupedProducts.expiringSoon, ...groupedProducts.fresh, ...groupedProducts.expired];
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.loadingImage}
          />
          <Text style={styles.loadingText}>Loading your fridge...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <StatusBar barStyle="dark-content" />
      
      {renderHeader()}
      
      {error ? (
        <View style={styles.errorContainer}>
          <IconSymbol name="house.fill" size={50} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.FlatList
          data={getFilteredProducts()}
          keyExtractor={(item) => item._id}
          renderItem={renderSwipeableProduct}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <IconSymbol name="house.fill" size={50} color={theme.colors.secondary} />
              <Text style={styles.emptyText}>
                {activeTab === 'all' 
                  ? "Your fridge is empty" 
                  : activeTab === 'expiring' 
                    ? "No items expiring soon" 
                    : "No expired items"}
              </Text>
              <Text style={styles.emptySubText}>
                {activeTab === 'all' 
                  ? "Add some items by scanning their barcodes" 
                  : activeTab === 'expiring' 
                    ? "All your items are fresh" 
                    : "Great job keeping your fridge fresh!"}
              </Text>
            </View>
          )}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  headerContainer: {
    position: 'relative',
    zIndex: 10,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#FF5252',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  productIconContainer: {
    marginRight: 16,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateContainer: {
    marginLeft: 8,
    alignItems: 'center',
  },
  expiryDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    width: 160,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumeButton: {
    backgroundColor: theme.colors.secondary,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    height: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});