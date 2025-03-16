
import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Button,
  Alert,
} from "react-native";
import { getGroups, createGroup, joinGroup } from "../../utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LeaderboardScreen() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      const response = await getGroups();
      if (response.success) {
        setGroups(response.groups);
      } else {
        setError(response.message);
      }
      setLoading(false);
    };

    fetchGroups();
  }, []);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name is required");
      return;
    }

    const response = await createGroup(groupName);
    if (response.success) {
      Alert.alert("Success", `Group "${response.group.groupName}" created!`);
      setGroupName("");
      setGroups((prevGroups) => [...prevGroups, response.group]);
    } else {
      Alert.alert("Error", response.message);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert("Error", "Group code is required");
      return;
    }

    const response = await joinGroup(groupCode);
    if (response.success) {
      Alert.alert("Success", "Joined the group successfully!");
      setGroupCode("");
      // Optionally refresh groups list here if needed
    } else {
      Alert.alert("Error", response.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading groups...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: "red" }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.title}>Leaderboard</Text>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.groupCode}
        renderItem={({ item }) => (
          <View style={styles.groupCard}>
            <Text style={styles.groupName}>{item.groupName}</Text>
            <Text>Created By: {item.createdBy}</Text>
            <Text>Code: {item.groupCode}</Text>
            <Text>Leaderboard:</Text>
            {item.leaderboard.map((user: any, index: number) => (
              <Text key={user.userID}>
                {index + 1}. {user.userName} - {user.score} pts
              </Text>
            ))}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Wrap the inputs & buttons in a container with extra bottom padding */}
      <View style={[styles.formContainer, { paddingBottom: insets.bottom + 30 }]}>
        <TextInput
          style={styles.input}
          placeholder="Enter Group Name"
          value={groupName}
          onChangeText={setGroupName}
        />
        <Button title="Create Group" onPress={handleCreateGroup} />

        <TextInput
          style={styles.input}
          placeholder="Enter Group Code"
          value={groupCode}
          onChangeText={setGroupCode}
        />
        <Button title="Join Group" onPress={handleJoinGroup} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  groupCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  formContainer: {
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    padding: 8,
    marginVertical: 6,
  },
});

