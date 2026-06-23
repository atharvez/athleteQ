// Design system constants — Sports Performance OS
export const COLORS = {
  // Brand
  primary: '#FC4C02',     // Strava Orange — action color
  secondary: '#242428',   // Dark Gray — secondary actions
  warning: '#F59E0B',     // Amber
  danger: '#D92D27',      // Red
  purple: '#8B5CF6',      // Testing state

  // Backgrounds
  dark: '#F2F2F6',        // Light gray — app bg (kept 'dark' key for compatibility but it's light)
  card: '#FFFFFF',        // White — card bg
  cardHover: '#FAFAFA',   // Slightly off-white
  border: '#E5E5EA',      // Light gray borders

  // Text
  text: '#242428',        // Dark gray text
  textSecondary: '#6D6D78', // Medium gray
  muted: '#A1A1A6',       // Light gray text

  // Status
  statusQueued: '#F59E0B',
  statusReady: '#10B981',
  statusTesting: '#FC4C02',
  statusCompleted: '#242428',
  statusError: '#D92D27',

  // QR background
  qrBackground: '#FFFFFF',
  qrForeground: '#242428',
};

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const STATUS_LABELS: Record<string, string> = {
  queued: '🟡 Queued',
  ready: '🟢 Ready',
  testing: '🔵 Testing',
  completed: '✅ Completed',
  pending: '⏳ Pending',
  active: '🟢 Active',
};

export const TEST_TYPE_LABELS: Record<string, string> = {
  '20m_sprint': '20m Sprint',
  '30m_sprint': '30m Sprint',
  agility: 'Agility',
};
