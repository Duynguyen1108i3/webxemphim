//
//  LiquidGlassTheme.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Direct translation of web Liquid Glass CSS variables & dynamic calculation engine
//

import SwiftUI
import Combine

/// Centralized Theme & Liquid Glass parameter management
public final class ThemeManager: ObservableObject {
    public static let shared = ThemeManager()
    
    // MARK: - Keys for Persistence
    private let glassnessKey = "rytox_system_glassness"
    private let ambientKey = "rytox_ambient_opacity"
    
    // MARK: - Published Properties
    @Published public var systemGlassness: Double {
        didSet {
            UserDefaults.standard.set(systemGlassness, forKey: glassnessKey)
        }
    }
    
    @Published public var ambientOpacity: Double {
        didSet {
            UserDefaults.standard.set(ambientOpacity, forKey: ambientKey)
        }
    }
    
    // MARK: - Computed Liquid Glass Tokens (matching web styles.css formula)
    
    /// Glass Blur Radius: Math.round(val * 32 + 6)
    public var glassBlur: CGFloat {
        CGFloat(round(systemGlassness * 32.0 + 6.0))
    }
    
    /// Glass Background Opacity: (0.92 - val * 0.70)
    public var glassBgOpacity: Double {
        max(0.10, min(0.95, 0.92 - (systemGlassness * 0.70)))
    }
    
    /// Glass Border Opacity: (0.08 + val * 0.22)
    public var glassBorderOpacity: Double {
        max(0.08, min(0.40, 0.08 + (systemGlassness * 0.22)))
    }
    
    /// Glass Specular Highlight Opacity: (0.04 + val * 0.20)
    public var glassSpecularOpacity: Double {
        max(0.04, min(0.35, 0.04 + (systemGlassness * 0.20)))
    }
    
    // MARK: - Colors derived from tokens
    public var glassBackgroundColor: Color {
        Color(red: 20/255, green: 20/255, blue: 24/255).opacity(glassBgOpacity)
    }
    
    public var glassBorderColor: Color {
        Color.white.opacity(glassBorderOpacity)
    }
    
    public var glassSpecularColor: Color {
        Color.white.opacity(glassSpecularOpacity)
    }
    
    // MARK: - Init
    private init() {
        let savedGlassness = UserDefaults.standard.object(forKey: glassnessKey) as? Double ?? 0.85
        let savedAmbient = UserDefaults.standard.object(forKey: ambientKey) as? Double ?? 0.65
        
        self.systemGlassness = savedGlassness
        self.ambientOpacity = savedAmbient
    }
    
    public func resetToDefaults() {
        self.systemGlassness = 0.85
        self.ambientOpacity = 0.65
    }
}
