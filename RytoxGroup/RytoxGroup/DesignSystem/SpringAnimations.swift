//
//  SpringAnimations.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Fluid physics-based spring curves mirroring web Framer Motion setup
//

import SwiftUI

public extension Animation {
    /// Standard iOS Spring curve (cubic-bezier(0.16, 1, 0.3, 1))
    static var iosSpring: Animation {
        .spring(response: 0.35, dampingFraction: 0.82, blendDuration: 0)
    }
    
    /// Elastic bounce spring
    static var iosSpringElastic: Animation {
        .spring(response: 0.42, dampingFraction: 0.68, blendDuration: 0)
    }
    
    /// Soft, slow modal and sheet spring
    static var iosSpringSlow: Animation {
        .spring(response: 0.52, dampingFraction: 0.88, blendDuration: 0)
    }
    
    /// Quick snappy feedback
    static var iosSnappy: Animation {
        .spring(response: 0.22, dampingFraction: 0.75, blendDuration: 0)
    }
}
