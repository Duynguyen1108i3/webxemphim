//
//  CastCrewView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Cast and director metadata display
//

import SwiftUI

public struct CastCrewView: View {
    public let cast: [String]
    public let director: String
    
    public init(cast: [String], director: String) {
        self.cast = cast
        self.director = director
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if !director.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("ĐẠO DIỄN")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white.opacity(0.45))
                    Text(director)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white)
                }
            }
            
            if !cast.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("DIỄN VIÊN")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white.opacity(0.45))
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(cast, id: \.self) { actor in
                                Text(actor)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(.white.opacity(0.85))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .liquidGlassPill()
                            }
                        }
                    }
                }
            }
        }
    }
}
