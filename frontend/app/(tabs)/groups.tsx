import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
  Pressable,
  Easing,
} from "react-native";
import { getGroups, createGroup, joinGroup } from "../../utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { theme } from "../../constants/theme";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { StatusBar } from "expo-status-bar";
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Group type definition
type User = {
  userName: string;
  userID: string;
  score: number;
};

type Group = {
  groupName: string;
  groupCode: string;
  createdBy: string;
  leaderboard: User[];
};

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");

  // Animation values
  const scrollY = useState(new Animated.Value(0))[0];
  const joinButtonScale = useState(new Animated.Value(1))[0];
  const createButtonScale = useState(new Animated.Value(1))[0];
  
  // Animation for modal background and content
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  
  // To track which modal should appear
  const [pendingModal, setPendingModal] = useState<'join' | 'create' | null>(null);
  
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Function to show background dim first, then modal
  const showModalWithSequence = (modalType: 'join' | 'create') => {
    // Set which modal we want to show after the background dims
    setPendingModal(modalType);
    
    // Reset animation values
    overlayOpacity.setValue(0);
    modalScale.setValue(0.8);
    
    // First animate the background to fade in
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start(() => {
      // After background is dimmed, now show the actual modal
      if (modalType === 'join') {
        setJoinModalVisible(true);
      } else {
        setCreateModalVisible(true);
      }
      
      // Animate the modal scaling in
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }).start();
    });
  };

  // Function to hide modal with animation
  const hideModal = (modalType: 'join' | 'create') => {
    Animated.parallel([
      // Animated.timing(overlayOpacity, {
      //   toValue: 0,
      //   duration: 0,
      //   useNativeDriver: true,
      // }),
      // Animated.timing(modalScale, {
      //   toValue: 0.0,
      //   duration: 0,
      //   useNativeDriver: true,
      // })
    ]).start(() => {
      if (modalType === 'join') {
        setJoinModalVisible(false);
      } else {
        setCreateModalVisible(false);
      }
      setPendingModal(null);
    });
  };

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getGroups();
      if (response.success) {
        setGroups(response.groups);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, []);

  const animateButton = (animatedValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name is required");
      return;
    }
  
    try {
      const response = await createGroup(groupName);
      if (response.success) {
        hideModal('create');
        Alert.alert("Success", `Group "${response.group.groupName}" created!`);
        setGroupName("");
        
        // Make sure the new group has the expected structure
        // specifically including a leaderboard array
        const newGroup = {
          ...response.group,
          leaderboard: response.group.leaderboard || [] // Add empty leaderboard if missing
        };
        
        // Add the new group to the list
        setGroups((prevGroups) => [...prevGroups, newGroup]);
        
        // Alternatively, refresh the full group list
        fetchGroups();
      } else {
        Alert.alert("Error", response.message);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to create group");
    }
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert("Error", "Group code is required");
      return;
    }

    try {
      const response = await joinGroup(groupCode);
      if (response.success) {
        hideModal('join');
        Alert.alert("Success", "Joined the group successfully!");
        setGroupCode("");
        // Refresh groups to show the newly joined group
        fetchGroups();
      } else {
        Alert.alert("Error", response.message);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to join group");
    }
  };

  // Render a single group card
  const renderGroupItem = ({ item }: { item: Group }) => (
    <View style={styles.groupCard}>
      <View style={styles.groupHeaderRow}>
        <Text style={styles.groupName}>{item.groupName}</Text>
        <View style={styles.groupCodeContainer}>
          <Text style={styles.groupCodeLabel}>Code:</Text>
          <Text style={styles.groupCode}>{item.groupCode}</Text>
        </View>
      </View>
      
      <View style={styles.leaderboardContainer}>
        <Text style={styles.leaderboardTitle}>🏆 Leaderboard</Text>
        
        {item.leaderboard.length > 0 ? (
          item.leaderboard.map((user, index) => (
            <View key={user.userID || `user-${index}`} style={[styles.leaderboardItem, index < 3 && styles.topThreeItem]}>
              <View style={[styles.positionBadge, {
                backgroundColor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#ffffff"
              }]}>
                <Text style={styles.positionText}>{index + 1}</Text>
              </View>
              <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                {user.userName}
              </Text>
              <Text style={styles.score}>{user.score} pts</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No members yet</Text>
        )}
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
      <Text style={styles.emptyText}>You haven't joined any groups yet</Text>
      <Text style={styles.emptySubText}>Create a new group or join with a code</Text>
    </View>
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
      
      <View style={[styles.headerContent]}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleEmoji}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.title}>My Groups</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchGroups}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: insets.top || 16,
        }
      ]}
    >
      <StatusBar style="dark" />
      
      {renderHeader()}

      <FlatList
        data={groups}
        keyExtractor={(item) => item.groupCode}
        renderItem={renderGroupItem}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={[
          styles.listContent,
          groups.length === 0 && styles.emptyListContent,
          { paddingBottom: tabBarHeight + 90 } // Add extra padding for the FAB buttons
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Floating Action Buttons - positioned above the tab bar */}
      <View style={[styles.fabContainer, { bottom: tabBarHeight + 16 }]}>
        <Animated.View style={{ transform: [{ scale: joinButtonScale }] }}>
          <Pressable 
            style={[styles.fab, styles.joinFab]} 
            onPress={() => {
              animateButton(joinButtonScale);
              showModalWithSequence('join');
            }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
          >
            <Text style={styles.fabIcon}>🔗</Text>
            <Text style={styles.fabText}>Join</Text>
          </Pressable>
        </Animated.View>
        
        <Animated.View style={{ transform: [{ scale: createButtonScale }] }}>
          <Pressable 
            style={[styles.fab, styles.createFab]}
            onPress={() => {
              animateButton(createButtonScale);
              showModalWithSequence('create');
            }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
          >
            <Text style={styles.fabIcon}>✏️</Text>
            <Text style={styles.fabText}>Create</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Custom modal overlay (for the background dim effect) */}
      {pendingModal !== null && (
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => pendingModal && hideModal(pendingModal)}
        >
          <Animated.View 
            style={[
              StyleSheet.absoluteFill,
              { opacity: overlayOpacity, backgroundColor: 'rgba(0, 0, 0, 0.5)' }
            ]}
          />
        </TouchableOpacity>
      )}

      {/* Create Group Modal */}
      {createModalVisible && (
        <View style={styles.modalContainer}>
          <Animated.View 
            style={[
              styles.centeredModalContent,
              { transform: [{ scale: modalScale }] }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Create Group</Text>
              <TouchableOpacity 
                onPress={() => hideModal('create')}
                style={styles.closeButtonContainer}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Group Name"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={30}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleCreateGroup} activeOpacity={0.8} testID="create-group">
              <Text style={styles.modalButtonText}>Create Group</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      
      {/* Join Group Modal */}
      {joinModalVisible && (
        <View style={styles.modalContainer}>
          <Animated.View 
            style={[
              styles.centeredModalContent,
              { transform: [{ scale: modalScale }] }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔗 Join Group</Text>
              <TouchableOpacity 
                onPress={() => hideModal('join')}
                style={styles.closeButtonContainer}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Group Code"
              value={groupCode}
              onChangeText={setGroupCode}
              autoCapitalize="characters"
              maxLength={6}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleJoinGroup} activeOpacity={0.8} testID="join-group">
              <Text style={styles.modalButtonText}>Join Group</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    flex: 1,
  },
  groupCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  groupCodeLabel: {
    fontSize: 12,
    color: "#666",
    marginRight: 4,
  },
  groupCode: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  leaderboardContainer: {
    marginTop: 8,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: theme.colors.secondary,
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  topThreeItem: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  positionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  positionText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  userName: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  score: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
    minWidth: 60,
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
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
  fabContainer: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    zIndex: 100,
  },
  fab: {
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  fabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  joinFab: {
    backgroundColor: theme.colors.secondary,
    marginRight: 10,
  },
  createFab: {
    backgroundColor: theme.colors.primary,
  },
  fabText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Custom modal styles
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000, // High z-index to ensure it covers everything
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001, // Higher than backdrop
  },
  centeredModalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  closeButtonContainer: {
    padding: 4,
  },
  closeButton: {
    fontSize: 22,
    color: "#999",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    width: '45%',
    marginHorizontal: 'auto',  
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
