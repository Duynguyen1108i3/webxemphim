//
//  Typography.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Typography design system mirroring web fonts (League Spartan, Playfair, Poppins)
//

import SwiftUI

public extension Font {
    /// Brand Logo style (League Spartan equivalent)
    static var brandLogo: Font {
        .system(size: 22, weight: .black, design: .default)
    }
    
    static var brandLogoLarge: Font {
        .system(size: 32, weight: .black, design: .default)
    }
    
    /// Hero Title style (Heavy, stacked display)
    static var heroTitle: Font {
        .system(size: 36, weight: .heavy, design: .default)
    }
    
    static var heroSubtitle: Font {
        .system(size: 16, weight: .semibold, design: .default)
    }
    
    /// Section / Row header title
    static var sectionTitle: Font {
        .system(size: 20, weight: .bold, design: .default)
    }
    
    /// Movie card title
    static var cardTitle: Font {
        .system(size: 13, weight: .semibold, design: .default)
    }
    
    /// Description & Synopsis (Playfair serif feel)
    static var synopsis: Font {
        .system(size: 14, weight: .regular, design: .serif)
    }
    
    static var synopsisLarge: Font {
        .system(size: 16, weight: .regular, design: .serif)
    }
    
    /// Pill & Badge typography
    static var pillText: Font {
        .system(size: 11, weight: .bold, design: .rounded)
    }
    
    static var badgeText: Font {
        .system(size: 10, weight: .heavy, design: .monospaced)
    }
    
    /// Metadata tags (year, runtime, rating)
    static var metadataTag: Font {
        .system(size: 12, weight: .medium, design: .default)
    }
}
