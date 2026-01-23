/**
 * WhatsApp-inspired theme for the mobile chat app
 */

export const Theme = {
    colors: {
        // WhatsApp Classic Palette
        primary: '#075e54',       // WhatsApp Dark Teal (Header)
        primaryLight: '#dcf8c6',  // WhatsApp Outbound Bubble
        primaryDark: '#054c44',

        accent: '#25D366',        // WhatsApp Green

        // Message bubbles
        outboundBubble: '#dcf8c6',
        outboundBubbleText: '#000000',
        inboundBubble: '#ffffff',
        inboundBubbleText: '#000000',

        // Backgrounds
        chatBackground: '#e5ddd5',
        chatBackgroundDark: '#0b141a',
        headerBackground: '#075e54',
        headerBackgroundDark: '#202c33',

        surface: '#ffffff',
        surfaceSecondary: '#f0f2f5',

        chatWallpaper: '#e5ddd5',

        // Typography Colors
        textPrimary: '#111b21',
        textSecondary: '#667781',
        textOnPrimary: '#ffffff',

        // UI Accents
        border: '#d1d7db',
        divider: '#e9edef',
        inputBg: '#ffffff',
        shadow: 'transparent',

        statusSent: '#8696a0',
        statusRead: '#53bdeb',
    },

    fonts: {
        regular: 'Almarai-Regular',
        bold: 'Almarai-Bold',
        header: 'Cairo-Bold',
    },

    spacing: {
        xs: 8,
        sm: 12,
        md: 16,
        lg: 24,
        xl: 32,
    },

    borderRadius: {
        sm: 8,
        md: 14,
        lg: 20,
        full: 9999,
    },

    typography: {
        h1: { fontFamily: 'Cairo-Bold', fontSize: 24, fontWeight: 'bold' as 'bold' },
        h2: { fontFamily: 'Cairo-Bold', fontSize: 20, fontWeight: 'bold' as 'bold' },
        h3: { fontFamily: 'Almarai-Bold', fontSize: 16, fontWeight: 'bold' as 'bold' },
        body: { fontFamily: 'Almarai-Regular', fontSize: 15, fontWeight: 'normal' as 'normal' },
        caption: { fontFamily: 'Almarai-Regular', fontSize: 12, fontWeight: '400' as '400' },
        small: { fontFamily: 'Almarai-Regular', fontSize: 11, fontWeight: '600' as '600' },
    },
};

/**
 * Generate a consistent color from a string (for avatars)
 */
export function avatarColorFromString(str: string): string {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from a name
 */
export function initialsFromName(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
