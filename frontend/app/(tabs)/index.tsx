import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { getProducts, deleteProduct } from '../../utils/api';
import { ThemedText } from '@/components/ThemedText';
import { Swipeable } from 'react-native-gesture-handler';

export default function HomeScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const response = await getProducts();
    if (response.success) {
      setProducts(response.product);
    } else {
      setError(response.message);
    }
    setLoading(false);
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
            const response = await deleteProduct(productId);
            if (response.success) {
              setProducts((prevProducts) => prevProducts.filter((product) => product._id !== productId));
            } else {
              Alert.alert("Error", response.message);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading fridge contents...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.titleContainer}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.headerImage}
          />
          <ThemedText type="title">Your Fridge</ThemedText>
        </View>
      }
      renderItem={({ item }) => (
        <Swipeable
          renderRightActions={() => (
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        >
          <View style={styles.productCard}>
            <Image
              source={require('@/assets/images/icon.png')} // Placeholder 
              style={styles.productImage}
            />
            <View>
              <ThemedText type="subtitle">{item.productName}</ThemedText>
              <Text>Quantity: {item.quantity}</Text>
              <Text>Expiry: {new Date(item.dateOfExpiry).toDateString()}</Text>
              <Text>Status: {item.status === 'not_expired' ? 'Fresh' : 'Expired'}</Text>
            </View>
          </View>
        </Swipeable>
      )}
      contentContainerStyle={{ paddingBottom: 16 }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    padding: 16,
    alignItems: 'center',
  },
  headerImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  productImage: {
    width: 50,
    height: 50,
    marginRight: 16,
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 5,
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
  },
});


