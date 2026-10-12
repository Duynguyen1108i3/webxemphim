//
//  MainTabView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Pure 100% Transparent Crystal Liquid Glass Home Navigation Dock
//  Zero dark tint, zero glow — Completely see-through optical glass showing content behind
//

import SwiftUI

public struct TabItemData: Identifiable, Equatable {
    public let id: Int
    public let title: String
    public let iconName: String
}

public struct MainTabView: View {
    @Binding public var selectedTab: Int
    
    // Gesture & Fluid Position Tracking
    @State private var isDragging: Bool = false
    @State private var pillOffsetX: CGFloat = 0
    @State private var closestTabIndex: Int = 0
    @State private var dragVelocityX: CGFloat = 0
    @State private var previousLocationX: CGFloat = 0
    
    private let tabs: [TabItemData] = [
        TabItemData(id: 0, title: "Trang Chủ", iconName: "house.fill"),
        TabItemData(id: 1, title: "Phim Bộ", iconName: "tv.fill"),
        TabItemData(id: 2, title: "Phim Lẻ", iconName: "film.fill"),
        TabItemData(id: 3, title: "Anime", iconName: "sparkles"),
        TabItemData(id: 4, title: "Cá Nhân", iconName: "heart.fill")
    ]
    
    public init(selectedTab: Binding<Int>) {
        self._selectedTab = selectedTab
    }
    
    public var body: some View {
        GeometryReader { proxy in
            let totalWidth = proxy.size.width
            let tabCount = CGFloat(tabs.count)
            let tabWidth = totalWidth / tabCount
            let pillWidth = tabWidth - 6
            let pillHeight: CGFloat = 48
            
            ZStack(alignment: .leading) {
                // 1. Dock Outer Shell — 100% Transparent Crystal Glass
                // Uses light-mode material environment with 0.35 opacity so Apple's dark-mode black shield
                // is completely eliminated. The movie posters and content behind are 100% visible and blurred!
                Capsule()
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .light)
                    .opacity(0.35)
                    .overlay(
                        // Specular glass sheen across top
                        Capsule()
                            .fill(
                                LinearGradient(
                                    stops: [
                                        .init(color: Color.white.opacity(0.18), location: 0.0),
                                        .init(color: Color.white.opacity(0.02), location: 0.45),
                                        .init(color: Color.clear, location: 1.0)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .overlay(
                        // Crisp crystal glass rim
                        Capsule()
                            .strokeBorder(
                                LinearGradient(
                                    stops: [
                                        .init(color: Color.white.opacity(0.45), location: 0.0),
                                        .init(color: Color.white.opacity(0.18), location: 0.5),
                                        .init(color: Color.white.opacity(0.06), location: 1.0)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1.0
                            )
                    )
                    // Natural subtle shadow to lift the transparent glass dock above content (no glow)
                    .shadow(color: Color.black.opacity(0.20), radius: 14, x: 0, y: 5)
                
                // 2. The Liquid Glass Slider Lens — Smoky Translucent Glass Droplet
                // Matching the exact fluid slider thumb in iOS 17/18 when dragged (stands out on transparent dock)
                ZStack {
                    // Glass blur core
                    Capsule()
                        .fill(.ultraThinMaterial)
                        .environment(\.colorScheme, .dark)
                        .opacity(isDragging ? 0.70 : 0.40)
                    
                    // Translucent smoky glass body (seen in screenshot at 60% slider)
                    Capsule()
                        .fill(
                            Color(red: 28/255, green: 28/255, blue: 35/255)
                                .opacity(isDragging ? 0.45 : 0.20)
                        )
                    
                    // Specular diagonal light reflection
                    Capsule()
                        .fill(
                            LinearGradient(
                                stops: [
                                    .init(color: Color.white.opacity(isDragging ? 0.38 : 0.20), location: 0.0),
                                    .init(color: Color.white.opacity(0.04), location: 0.4),
                                    .init(color: Color.clear, location: 0.85)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    // Fine specular glass rim (thin crisp 1px edge)
                    Capsule()
                        .strokeBorder(
                            LinearGradient(
                                stops: [
                                    .init(color: Color.white.opacity(isDragging ? 0.65 : 0.38), location: 0.0),
                                    .init(color: Color.white.opacity(isDragging ? 0.25 : 0.14), location: 0.5),
                                    .init(color: Color.white.opacity(0.05), location: 1.0)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1.0
                        )
                }
                .frame(
                    width: isDragging ? pillWidth + min(16, abs(dragVelocityX) * 0.08) : pillWidth,
                    height: isDragging ? pillHeight + 2 : pillHeight
                )
                // Fluid lens expansion when actively pressing/dragging
                .scaleEffect(isDragging ? 1.04 : 1.0)
                // Subtle realistic shadow (no glow)
                .shadow(
                    color: Color.black.opacity(isDragging ? 0.32 : 0.18),
                    radius: isDragging ? 10 : 4,
                    x: 0,
                    y: isDragging ? 3 : 2
                )
                .offset(x: pillOffsetX)
                .animation(
                    isDragging
                        ? .interactiveSpring(response: 0.16, dampingFraction: 0.85)
                        : .spring(response: 0.32, dampingFraction: 0.72, blendDuration: 0),
                    value: pillOffsetX
                )
                
                // 3. Tab Labels & Icons Layer
                // Clean typography floating clearly above the transparent crystal glass
                HStack(spacing: 0) {
                    ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                        let isHighlighted = (isDragging ? closestTabIndex : selectedTab) == index
                        
                        Button(action: {
                            HapticFeedback.selection()
                            withAnimation(.spring(response: 0.32, dampingFraction: 0.72)) {
                                selectedTab = index
                                closestTabIndex = index
                                pillOffsetX = snapOffset(for: index, tabWidth: tabWidth)
                            }
                        }) {
                            VStack(spacing: 3) {
                                Image(systemName: tab.iconName)
                                    .font(.system(size: 18, weight: isHighlighted ? .bold : .medium))
                                    .foregroundColor(isHighlighted ? .white : Color.white.opacity(0.60))
                                    .scaleEffect(isHighlighted ? 1.14 : 1.0)
                                
                                Text(tab.title)
                                    .font(.system(size: 10, weight: isHighlighted ? .heavy : .medium))
                                    .foregroundColor(isHighlighted ? .white : Color.white.opacity(0.60))
                                    .lineLimit(1)
                            }
                            .frame(width: tabWidth, height: 56)
                            .contentShape(Rectangle())
                            .animation(.interactiveSpring(response: 0.18, dampingFraction: 0.78), value: isHighlighted)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(height: 56)
            .onAppear {
                closestTabIndex = selectedTab
                pillOffsetX = snapOffset(for: selectedTab, tabWidth: tabWidth)
            }
            .onChange(of: selectedTab) { newTab in
                if !isDragging {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.72)) {
                        closestTabIndex = newTab
                        pillOffsetX = snapOffset(for: newTab, tabWidth: tabWidth)
                    }
                }
            }
            // 4. Continuous Drag & Scrub Gesture with Fluid Inertia ("Đè vào kéo qua lại")
            .gesture(
                DragGesture(minimumDistance: 0, coordinateSpace: .local)
                    .onChanged { gesture in
                        if !isDragging {
                            isDragging = true
                            previousLocationX = gesture.location.x
                            HapticFeedback.light()
                        }
                        
                        // Velocity tracking for fluid stretching
                        let deltaX = gesture.location.x - previousLocationX
                        dragVelocityX = deltaX
                        previousLocationX = gesture.location.x
                        
                        // 1:1 Continuous glide tracking
                        let rawPillX = gesture.location.x - (pillWidth / 2)
                        let minPillX: CGFloat = 3
                        let maxPillX: CGFloat = totalWidth - pillWidth - 3
                        let clampedX = max(minPillX, min(maxPillX, rawPillX))
                        
                        self.pillOffsetX = clampedX
                        
                        // Check which tab is under the center of the lens
                        let pillCenterX = clampedX + (pillWidth / 2)
                        let newClosest = min(tabs.count - 1, max(0, Int(pillCenterX / tabWidth)))
                        
                        if newClosest != closestTabIndex {
                            HapticFeedback.selection() // Tactile click as lens passes tab
                            closestTabIndex = newClosest
                        }
                    }
                    .onEnded { gesture in
                        let pillCenterX = pillOffsetX + (pillWidth / 2)
                        let finalTab = min(tabs.count - 1, max(0, Int(pillCenterX / tabWidth)))
                        
                        HapticFeedback.medium()
                        withAnimation(.spring(response: 0.30, dampingFraction: 0.70, blendDuration: 0)) {
                            self.closestTabIndex = finalTab
                            self.selectedTab = finalTab
                            self.pillOffsetX = snapOffset(for: finalTab, tabWidth: tabWidth)
                            self.isDragging = false
                            self.dragVelocityX = 0
                        }
                    }
            )
        }
        .frame(height: 56)
        .padding(.horizontal, 18)
        .padding(.bottom, 10)
    }
    
    private func snapOffset(for index: Int, tabWidth: CGFloat) -> CGFloat {
        return CGFloat(index) * tabWidth + 3
    }
}
