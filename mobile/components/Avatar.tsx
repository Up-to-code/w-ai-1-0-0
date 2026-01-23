import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme, avatarColorFromString, initialsFromName } from '../constants/Theme';

interface AvatarProps {
    name: string;
    id?: string;
    size?: number;
}

export function Avatar({ name, id, size = 50 }: AvatarProps) {
    const seed = id ? `${id}:${name}` : name;
    const backgroundColor = avatarColorFromString(seed);
    const initials = initialsFromName(name);

    return (
        <View style={[
            styles.container,
            { width: size, height: size, borderRadius: Theme.borderRadius.md, backgroundColor },
            styles.shadow
        ]}>
            <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadow: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
});
