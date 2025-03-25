import React, { useEffect, useState } from "react";
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
} from "react-native";
import {
  getNotificationsInbox,
  markNotificationAsRead,
  deleteNotification,
} from "../../utils/api";
import moment from "moment";

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

  const fetchNotifications = async () => {
    const result = await getNotificationsInbox();
    if (result.success) {
      setNotifications(result.notifications);
    } else {
      console.error("Failed to fetch notifications:", result.message);
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
    const res = await markNotificationAsRead(id);
    if (res.success) {
      showToast("Marked as read");
      fetchNotifications();
    } else {
      showToast("Failed to mark as read");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Notification", "Are you sure you want to delete this?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await deleteNotification(id);
          if (res.success) {
            showToast("Notification deleted");
            fetchNotifications();
          } else {
            showToast("Failed to delete notification");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleMarkAsRead(item._id)}
      onLongPress={() => handleDelete(item._id)}
      style={[
        styles.notificationContainer,
        !item.read && styles.unread,
      ]}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.timestamp}>
        {moment(item.createdAt).fromNow()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notifications yet 📭</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
  },
  notificationContainer: {
    padding: 16,
    marginVertical: 6,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
  },
  unread: {
    backgroundColor: "#e3e8ff",
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
  },
  body: {
    marginTop: 4,
    fontSize: 14,
    color: "#555",
  },
  timestamp: {
    marginTop: 6,
    fontSize: 12,
    color: "#888",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#999",
    fontSize: 16,
  },
});
