import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ToastAndroid,
  Platform,
  Animated,
  StatusBar,
  ActivityIndicator
} from "react-native";
import {
  getNotificationsInbox,
  markNotificationAsRead,
  deleteNotification,
} from "../../utils/api";
import moment from "moment";
import { theme } from "../../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

interface Notification {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  type: string;
}

export default function InboxScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getNotificationsInbox();
      if (result.success) {
        setNotifications(result.notifications);
      } else {
        console.error("Failed to fetch notifications:", result.message);
        setError("Couldn't load notifications");
      }
    } catch (error) {
      console.error("Error in fetchNotifications:", error);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("", message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await markNotificationAsRead(id);
      if (res.success) {
        showToast("Marked as read");
        // Update local state instead of refetching
        setNotifications(prev => 
          prev.map(n => n._id === id ? {...n, read: true} : n)
        );
      } else {
        showToast("Failed to mark as read");
      }
    } catch (error) {
      showToast("Error updating notification");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Notification", 
      "Are you sure you want to delete this?", 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteNotification(id);
              if (res.success) {
                showToast("Notification deleted");
                // Update local state instead of refetching
                setNotifications(prev => prev.filter(n => n._id !== id));
              } else {
                showToast("Failed to delete notification");
              }
            } catch (error) {
              showToast("Error deleting notification");
            }
          },
        },
      ]
    );
  };

  // Get emoji based on notification type
  const getNotificationEmoji = (type: string) => {
    switch (type) {
      case 'FOOD_EXPIRY':
        return '⏰';
      case 'LEADERBOARD_UPDATE':
        return '🏆';
      default:
        return '📬';
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => !item.read && handleMarkAsRead(item._id)}
      onLongPress={() => handleDelete(item._id)}
      style={[
        styles.notificationContainer,
        !item.read && styles.unread,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emojiText}>{getNotificationEmoji(item.type)}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.timestamp}>
            {moment(item.createdAt).fromNow()}
          </Text>
        </View>
      </View>
      {!item.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  // Calculate the header background opacity based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Animated.View 
        style={[
          styles.headerBackground, 
          { opacity: headerOpacity, paddingTop: insets.top }
        ]} 
      />
      
      <View style={[styles.headerContent, { paddingTop: insets.top }]}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleEmoji}>📬</Text>
          <Text style={styles.headerTitle}>Inbox</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
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
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubText}>
                Notifications about expiring food and leaderboard updates will appear here
              </Text>
            </View>
          }
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
  titleEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  notificationContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  unread: {
    backgroundColor: '#EDF7FF',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  notificationTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: "#888",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 16,
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
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 16,
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