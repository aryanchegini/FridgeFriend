import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Alert
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthProvider';
import { theme } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function AppIndex() {
  const { authToken, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [hasCheckedFirstLaunch, setHasCheckedFirstLaunch] = useState(false);
  
  // Animation values
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const logoScale = React.useRef(new Animated.Value(0.8)).current;
  const titleOpacity = React.useRef(new Animated.Value(0)).current;
  const buttonOpacity = React.useRef(new Animated.Value(0)).current;
  
  // Add a safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("Loading timeout reached - forcing continuation");
        setShowSplash(false);
      }
    }, 5000); // 5 second safety timeout
    
    return () => clearTimeout(timeout);
  }, [isLoading]);
  
  useEffect(() => {
    // Check if this is the first launch
    const checkFirstLaunch = async () => {
      try {
        const value = await AsyncStorage.getItem('hasLaunchedBefore');
        setIsFirstLaunch(value === null);
      } catch (err) {
        console.error("Error checking first launch:", err);
        // Default to false in case of error
        setIsFirstLaunch(false);
      } finally {
        setHasCheckedFirstLaunch(true);
      }
    };
    
    checkFirstLaunch();
  }, []);
  
  // Only start animations after we've checked first launch
  useEffect(() => {
    if (hasCheckedFirstLaunch) {
      // Run entrance animations
      Animated.sequence([
        // First show the logo
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        
        // Then show the title
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          delay: 200,
        }),
        
        // Then show the buttons
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // If the user is already logged in or it's not the first launch,
        // don't show the splash screen for long
        if (authToken || isFirstLaunch === false) {
          setTimeout(() => {
            setShowSplash(false);
          }, 500);
        }
      });
    }
  }, [hasCheckedFirstLaunch, isFirstLaunch, authToken]);

  const handleGetStarted = async () => {
    // Mark that the app has been launched before
    try {
      await AsyncStorage.setItem('hasLaunchedBefore', 'true');
    } catch (err) {
      console.error('Error saving first launch state:', err);
    }
    
    setShowSplash(false);
  };

  // If loading and within reasonable time, show a loading indicator
  if (isLoading && !hasCheckedFirstLaunch) {
    console.log("Showing loading indicator");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Starting FridgeFriend...</Text>
      </View>
    );
  }
  
  // If user is authenticated or if this isn't the first launch and splash screen is done, redirect
  if ((authToken || isFirstLaunch === false) && !showSplash) {
    console.log("Redirecting to appropriate screen:", authToken ? "tabs" : "login");
    return authToken ? (
      <Redirect href={'/(tabs)'} />
    ) : (
      <Redirect href={'/(auth)/login'} />
    );
  }
  
  // Show the welcome splash screen for new users
  if ((isFirstLaunch === true || !hasCheckedFirstLaunch) && showSplash) {
    console.log("Showing welcome splash screen");
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        <View style={styles.topDecoration} />
        
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }]
            }
          ]}
        >
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
          />
        </Animated.View>
        
        <Animated.View style={{ opacity: titleOpacity }}>
          <Text style={styles.title}>FridgeFriend</Text>
          <Text style={styles.subtitle}>
            Manage your food inventory, reduce waste, and never forget expiry dates again!
          </Text>
        </Animated.View>
        
        <Animated.View style={[styles.featuresContainer, { opacity: titleOpacity }]}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>📱</Text>
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Easy Scanning</Text>
              <Text style={styles.featureDescription}>
                Quickly add products by scanning barcodes
              </Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>🔔</Text>
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Expiry Alerts</Text>
              <Text style={styles.featureDescription}>
                Get notified before your food expires
              </Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>👨‍👩‍👧‍👦</Text>
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Family Sharing</Text>
              <Text style={styles.featureDescription}>
                Share your inventory with family and roommates
              </Text>
            </View>
          </View>
        </Animated.View>
        
        <Animated.View style={[styles.buttonsContainer, { opacity: buttonOpacity }]}>
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => setShowSplash(false)}
          >
            <Text style={styles.loginText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }
  
  // Show a minimal loading screen while transitioning
  console.log("Showing transition loading screen");
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: width * 0.8,
    height: height * 0.3,
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: width * 0.5,
    opacity: 0.5,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: width * 0.8,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: theme.colors.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  getStartedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButton: {
    paddingVertical: 12,
  },
  loginText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
});
