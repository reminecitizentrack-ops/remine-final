// src/navigation/TabNavigator.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

import HomeScreen             from '../screens/HomeScreen';
import MapScreen              from '../screens/MapScreen';
import MesSignalementsScreen  from '../screens/MesSignalementsScreen';
import CitizenDashboardScreen from '../screens/CitizenDashboardScreen';

const Tab = createBottomTabNavigator();

const HISTORY_KEY = 'remine_notification_history';

// ─── Badge ───────────────────────────────────────────────────────────────────

function Badge({ count }) {
  if (!count || count === 0) return null;
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position:        'absolute',
    top:             -4,
    right:           -8,
    minWidth:        16,
    height:          16,
    borderRadius:    8,
    backgroundColor: '#ef4444',
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
    borderWidth:     2,
    borderColor:     '#fff',
  },
  badgeText: {
    color:      '#fff',
    fontSize:   9,
    fontWeight: '800',
    lineHeight: 12,
  },
});

// ─── Tab bar custom ───────────────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { lastNotification } = useNotification();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const data = raw ? JSON.parse(raw) : [];
      const count = data.filter(n => n && n.id && !n.read).length;
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  // Recharger le count à chaque nouvelle notification reçue
  useEffect(() => {
    loadUnread();
  }, [lastNotification, loadUnread]);

  // Recharger quand on revient sur un onglet
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadUnread);
    return unsubscribe;
  }, [navigation, loadUnread]);

  const TABS = {
    Home:            { emoji: '🏠', label: 'Accueil'  },
    Map:             { emoji: '🗺️', label: 'Carte'     },
    MesSignalements: { emoji: '📋', label: 'Mes signalements' },
    Dashboard:       { emoji: '📊', label: 'Dashboard' },
  };

  // Badges par onglet — on met les notifs non lues sur l'onglet Notifications
  // accessible depuis HomeScreen. On les affiche sur Home pour l'instant.
  const BADGES = {
    Home:            unreadCount,
    Map:             0,
    MesSignalements: 0,
    Dashboard:       0,
  };

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8, backgroundColor: colors.tabBar, borderTopColor: colors.tabBorder }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = TABS[route.name];
        if (!tab) return null;

        const badgeCount = BADGES[route.name] || 0;

        // Effacer le badge Accueil quand on arrive dessus
        const onPress = async () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Insérer le bouton ➕ juste avant MesSignalements
        const showReportButton = route.name === 'MesSignalements';

        return (
          <React.Fragment key={route.key}>
            {showReportButton && (
              <TouchableOpacity
                style={styles.reportButtonWrapper}
                onPress={() => navigation.getParent()?.navigate('Report')}
                activeOpacity={0.85}
              >
                <View style={styles.reportButtonInner}>
                  <Text style={styles.reportButtonIcon}>➕</Text>
                  <Text style={styles.reportButtonLabel}>Signaler</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {isFocused && <View style={[styles.activeIndicator, { backgroundColor: colors.tabActive }]} />}

              <View style={styles.iconWrapper}>
                <Text style={[styles.tabIcon, { opacity: isFocused ? 1 : 0.5 }]}>
                  {tab.emoji}
                </Text>
                <Badge count={badgeCount} />
              </View>

              <Text style={[styles.tabLabel, { color: isFocused ? colors.tabActive : colors.tabInactive }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Navigateur ───────────────────────────────────────────────────────────────

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"            component={HomeScreen}             />
      <Tab.Screen name="Map"             component={MapScreen}              />
      <Tab.Screen name="MesSignalements" component={MesSignalementsScreen}  />
      <Tab.Screen name="Dashboard"       component={CitizenDashboardScreen} />
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors) => StyleSheet.create({
  tabBar: {
    flexDirection:   'row',
    backgroundColor: 'transparent',
    borderTopWidth:  1,
    borderTopColor:  'transparent',
    paddingTop:      8,
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       10,
  },
  tabItem: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 4,
    position:        'relative',
  },
  activeIndicator: {
    position:        'absolute',
    top:             0,
    width:           28,
    height:          3,
    borderRadius:    2,
    backgroundColor: '#16a34a',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 3,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize:   10,
    fontWeight: '600',
    textAlign:  'center',
  },

  // Bouton Signaler
  reportButtonWrapper: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      -20,
  },
  reportButtonInner: {
    width:           62,
    height:          62,
    borderRadius:    31,
    backgroundColor: '#2563eb',
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#2563eb',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    8,
    elevation:       8,
    borderWidth:     3,
    borderColor:     '#fff',
  },
  reportButtonIcon: {
    fontSize:     20,
    marginBottom: 1,
  },
  reportButtonLabel: {
    fontSize:   9,
    color:      '#fff',
    fontWeight: '700',
  },
});