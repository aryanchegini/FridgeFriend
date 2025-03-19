// app/(tabs)/profile.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthProvider';
import { theme } from '../../constants/theme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification settings toggles
  const [expiryNotifications, setExpiryNotifications] = useState(true);
  const [leaderboardNotifications, setLeaderboardNotifications] = useState(true);
  
  // Mock user data - replace with actual user data from context when available
  const userData = {
    name: user?.name || 'FridgeFriend User',
    email: user?.email || 'user@example.com',
    joinDate: 'March 2025',
    productsAdded: 27,
    productsConsumed: 18,
    foodSaved: '5.2 kg'
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await signOut();
              router.replace('/(auth)/login' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to log out');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const MenuSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress,
    rightElement
  }: { 
    icon: string, 
    title: string, 
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  }) => (
    <TouchableOpacity 
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuItemIconContainer}>
        <IconSymbol name={icon as any} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.menuItemTextContainer}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <IconSymbol name="chevron.right" size={20} color="#ccc" />
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={[
      styles.container, 
      { 
        paddingTop: insets.top || 16,
        paddingBottom: tabBarHeight
      }
    ]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Text style={styles.profileInitials}>
              {userData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{userData.name}</Text>
          <Text style={styles.userEmail}>{userData.email}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.productsAdded}</Text>
              <Text style={styles.statLabel}>Added</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.productsConsumed}</Text>
              <Text style={styles.statLabel}>Consumed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.foodSaved}</Text>
              <Text style={styles.statLabel}>Food Saved</Text>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <MenuSection title="Account">
          <MenuItem 
            icon="house.fill" 
            title="Edit Profile" 
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')} 
          />
          <MenuItem 
            icon="house.fill" 
            title="Change Password" 
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')} 
          />
          <MenuItem 
            icon="house.fill" 
            title="Connected Devices" 
            subtitle="Manage devices with access to your account"
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')} 
          />
        </MenuSection>

        {/* Notifications Section */}
        <MenuSection title="Notifications">
          <MenuItem 
            icon="house.fill" 
            title="Expiry Alerts" 
            subtitle="Get notified before your food expires"
            rightElement={
              <Switch 
                value={expiryNotifications}
                onValueChange={setExpiryNotifications}
                trackColor={{ false: '#e0e0e0', true: `${theme.colors.primary}80` }}
                thumbColor={expiryNotifications ? theme.colors.primary : '#f4f3f4'}
                ios_backgroundColor="#e0e0e0"
              />
            }
          />
          <MenuItem 
            icon="house.fill" 
            title="Leaderboard Updates" 
            subtitle="Get notified about group leaderboard changes"
            rightElement={
              <Switch 
                value={leaderboardNotifications}
                onValueChange={setLeaderboardNotifications}
                trackColor={{ false: '#e0e0e0', true: `${theme.colors.primary}80` }}
                thumbColor={leaderboardNotifications ? theme.colors.primary : '#f4f3f4'}
                ios_backgroundColor="#e0e0e0"
              />
            }
          />
        </MenuSection>

        {/* Help & Support Section */}
        <MenuSection title="Help & Support">
          <MenuItem 
            icon="house.fill" 
            title="Help Center" 
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')} 
          />
          <MenuItem 
            icon="house.fill" 
            title="Privacy Policy" 
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')} 
          />
          <MenuItem 
            icon="house.fill" 
            title="Terms of Service" 
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')} 
          />
        </MenuSection>

        {/* Version Info */}
        <Text style={styles.versionText}>FridgeFriend v1.0.0</Text>
        
        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <IconSymbol name="house.fill" size={20} color="#f44336" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitials: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
    marginLeft: 8,
  },
});