import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  getProducts,
  deleteProduct,
  updateProductStatus,
} from "../../utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { theme } from "@/constants/theme";

const { width } = Dimensions.get("window");

// Product Type
interface Product {
  _id: string;
  productName: string;
  quantity: string;
  dateOfExpiry: string;
  status: "not_expired" | "expired" | "consumed";
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

// Get emoji icon based on product status
const getProductEmoji = (daysUntilExpiry: number, status: string) => {
  if (status === "consumed") {
    return "✅";
  } else if (status === "expired" || daysUntilExpiry < 0) {
    return "⚠️";
  } else if (daysUntilExpiry <= 3) {
    return "⏱️";
  } else if (daysUntilExpiry <= 7) {
    return "🥗";
  } else {
    return "🍎";
  }
};

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [groupedProducts, setGroupedProducts] = useState<{
    expiringSoon: Product[];
    fresh: Product[];
    expired: Product[];
    consumed: Product[];
  }>({
    expiringSoon: [],
    fresh: [],
    expired: [],
    consumed: [],
  });

  const [activeTab, setActiveTab] = useState<
    "all" | "expiring" | "expired" | "consumed"
  >("all");

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProducts();
      if (response.success) {
        console.log("Fetched products:", response.product.length);
        setProducts(response.product);
        groupProducts(response.product);
      } else {
        console.error("Error fetching products:", response.message);
        setError(response.message);
      }
    } catch (err) {
      console.error("Exception fetching products:", err);
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const groupProducts = (productList: Product[]) => {
    const grouped = {
      expiringSoon: [] as Product[],
      fresh: [] as Product[],
      expired: [] as Product[],
      consumed: [] as Product[],
    };

    productList.forEach((product) => {
      if (product.status === "consumed") {
        grouped.consumed.push(product);
      } else if (product.status === "expired") {
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

    // Sort by expiry date (soonest first for active products)
    grouped.expiringSoon.sort(
      (a, b) =>
        new Date(a.dateOfExpiry).getTime() - new Date(b.dateOfExpiry).getTime()
    );
    grouped.fresh.sort(
      (a, b) =>
        new Date(a.dateOfExpiry).getTime() - new Date(b.dateOfExpiry).getTime()
    );

    // Sort consumed products by most recently consumed (assuming dateLogged is updated on consumption)
    // If no specific timestamp is available, we can use _id as a rough proxy since MongoDB ObjectIDs contain a timestamp
    grouped.consumed.sort((a, b) => b._id.localeCompare(a._id));

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
              setActionInProgress(productId);
              const response = await deleteProduct(productId);
              if (response.success) {
                console.log("Product deleted successfully:", productId);
                const updatedProducts = products.filter(
                  (product) => product._id !== productId
                );
                setProducts(updatedProducts);
                groupProducts(updatedProducts);
              } else {
                console.error("Error deleting product:", response.message);
                Alert.alert("Error", response.message);
              }
            } catch (error) {
              console.error("Exception deleting product:", error);
              Alert.alert("Error", "Failed to delete product");
            } finally {
              setActionInProgress(null);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const markAsConsumed = async (productId: string) => {
    try {
      setActionInProgress(productId);
      console.log("Marking product as consumed:", productId);

      // Call the API to update the product status
      const response = await updateProductStatus(productId, "consumed");

      if (response.success) {
        console.log("Product marked as consumed successfully:", productId);
        // Update local state to reflect the change
        const updatedProducts = products.map((product) =>
          product._id === productId
            ? { ...product, status: "consumed" as const }
            : product
        );

        setProducts(updatedProducts);
        groupProducts(updatedProducts);

        // Feedback to user
        Alert.alert("Success", "Product marked as consumed");
      } else {
        console.error(
          "API Error marking product as consumed:",
          response.message
        );
        Alert.alert(
          "Error",
          response.message || "Failed to mark product as consumed"
        );
      }
    } catch (error) {
      console.error("Exception marking product as consumed:", error);
      Alert.alert("Error", "Failed to mark product as consumed");
    } finally {
      setActionInProgress(null);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    // Calculate days until expiry
    const daysUntilExpiry = getDaysUntilExpiry(item.dateOfExpiry);

    // Determine status label and color
    let statusColor = "#4CAF50"; // default green
    let statusLabel = "Fresh";

    if (item.status === "consumed") {
      statusColor = "#9E9E9E"; // gray
      statusLabel = "Consumed";
    } else if (item.status === "expired" || daysUntilExpiry < 0) {
      statusColor = "#F44336"; // red
      statusLabel = "Expired";
    } else if (daysUntilExpiry <= 3) {
      statusColor = "#FF9800"; // orange
      statusLabel = `${daysUntilExpiry} day${
        daysUntilExpiry !== 1 ? "s" : ""
      } left`;
    } else {
      statusLabel = `${daysUntilExpiry} days left`;
    }

    // Get emoji for product
    const productEmoji = getProductEmoji(daysUntilExpiry, item.status);

    // Only show action buttons if not already consumed
    const showActions = item.status !== "consumed";
    const isProcessing = actionInProgress === item._id;

    return (
      <View style={styles.productCard}>
        <View style={styles.productCardContent}>
          <View
            style={[
              styles.productIconContainer,
              { backgroundColor: statusColor + "15" },
            ]}
          >
            <Text style={styles.productEmoji}>{productEmoji}</Text>
          </View>

          <View style={styles.productDetails}>
            <Text
              style={styles.productName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.productName}
            </Text>
            <Text style={styles.productQuantity}>Qty: {item.quantity}</Text>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: statusColor + "20" },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.expiryDate}>
              {new Date(item.dateOfExpiry).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Action buttons displayed directly in the card */}
        {showActions && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => markAsConsumed(item._id)}
              disabled={isProcessing}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  isProcessing && styles.actionButtonTextDisabled,
                ]}
              >
                {isProcessing ? "⏳" : "✅"} Consumed
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonDivider} />

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item._id)}
              disabled={isProcessing}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  isProcessing && styles.actionButtonTextDisabled,
                ]}
              >
                {isProcessing ? "⏳" : "🗑️"} Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* For consumed items, just show delete option */}
        {!showActions && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.fullWidthButton]}
              onPress={() => handleDelete(item._id)}
              disabled={isProcessing}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  isProcessing && styles.actionButtonTextDisabled,
                ]}
              >
                {isProcessing ? "⏳" : "🗑️"} Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    // Calculate the opacity for header background based on scroll position
    const headerOpacity = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.headerContainer}>
        <Animated.View
          style={[
            styles.headerBackground,
            { opacity: headerOpacity, paddingTop: insets.top },
          ]}
        />

        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleEmoji}>🍎</Text>
            <Text style={styles.title}>My Fridge</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            <TouchableOpacity
              style={[styles.tab, activeTab === "all" && styles.activeTab]}
              onPress={() => setActiveTab("all")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "all" && styles.activeTabText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "expiring" && styles.activeTab]}
              onPress={() => setActiveTab("expiring")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "expiring" && styles.activeTabText,
                ]}
              >
                Expiring Soon
              </Text>
              {groupedProducts.expiringSoon.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {groupedProducts.expiringSoon.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "expired" && styles.activeTab]}
              onPress={() => setActiveTab("expired")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "expired" && styles.activeTabText,
                ]}
              >
                Expired
              </Text>
              {groupedProducts.expired.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {groupedProducts.expired.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "consumed" && styles.activeTab]}
              onPress={() => setActiveTab("consumed")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "consumed" && styles.activeTabText,
                ]}
              >
                Consumed
              </Text>
              {groupedProducts.consumed.length > 0 && (
                <View style={[styles.badge, styles.consumedBadge]}>
                  <Text style={styles.badgeText}>
                    {groupedProducts.consumed.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    );
  };

  const getFilteredProducts = () => {
    switch (activeTab) {
      case "expiring":
        return groupedProducts.expiringSoon;
      case "expired":
        return groupedProducts.expired;
      case "consumed":
        return groupedProducts.consumed;
      case "all":
      default:
        // Notice we don't include consumed items in "All" tab
        return [
          ...groupedProducts.expiringSoon,
          ...groupedProducts.fresh,
          ...groupedProducts.expired,
        ];
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your fridge...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <StatusBar barStyle="dark-content" />

      {renderHeader()}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={getFilteredProducts()}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
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
              <Text style={styles.emptyEmoji}>
                {activeTab === "all"
                  ? "🛒"
                  : activeTab === "expiring"
                  ? "👍"
                  : activeTab === "expired"
                  ? "👏"
                  : "🍽️"}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === "all"
                  ? "Your fridge is empty"
                  : activeTab === "expiring"
                  ? "No items expiring soon"
                  : activeTab === "expired"
                  ? "No expired items"
                  : "No consumed items"}
              </Text>
              <Text style={styles.emptySubText}>
                {activeTab === "all"
                  ? "Add some items by scanning their barcodes"
                  : activeTab === "expiring"
                  ? "All your items are fresh"
                  : activeTab === "expired"
                  ? "Great job keeping your fridge fresh!"
                  : "Items you mark as consumed will appear here"}
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
    backgroundColor: "#f7f9fc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    color: theme.colors.secondary,
    fontWeight: "500",
  },
  headerContainer: {
    position: "relative",
    zIndex: 10,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
    backgroundColor: "#fff",
    shadowColor: "#000",
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  titleEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingBottom: 8,
    paddingRight: 16, // Add some padding for horizontal scroll
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "500",
  },
  badge: {
    backgroundColor: "#FF5252",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  consumedBadge: {
    backgroundColor: "#4CAF50",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productCardContent: {
    flexDirection: "row",
    padding: 14,
    alignItems: "center",
  },
  productIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productEmoji: {
    fontSize: 20,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  statusChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  dateContainer: {
    marginLeft: 8,
    alignItems: "center",
    width: 54,
  },
  expiryDate: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  actionContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  fullWidthButton: {
    width: "100%",
  },
  actionButtonText: {
    fontSize: 14,
    color: "#666",
  },
  actionButtonTextDisabled: {
    color: "#ccc",
  },
  buttonDivider: {
    width: 1,
    backgroundColor: "#f0f0f0",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    height: 300,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});
