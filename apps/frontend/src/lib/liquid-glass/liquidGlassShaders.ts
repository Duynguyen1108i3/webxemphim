/**
 * WebGL Shaders for Apple Liquid Glass effect
 * Based directly on dashersw/liquid-glass-js
 * Enhanced with specular rim sheen and translucent optical transmission
 */

export const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texcoord;
varying vec2 v_texcoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texcoord = a_texcoord;
}
`;

export const CONTAINER_FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_textureSize;
uniform float u_scrollY;
uniform float u_pageHeight;
uniform float u_viewportHeight;
uniform float u_blurRadius;
uniform float u_borderRadius;
uniform vec2 u_containerPosition;
uniform float u_warp;
uniform float u_edgeIntensity;
uniform float u_rimIntensity;
uniform float u_baseIntensity;
uniform float u_edgeDistance;
uniform float u_rimDistance;
uniform float u_baseDistance;
uniform float u_cornerBoost;
uniform float u_rippleEffect;
uniform float u_tintOpacity;
varying vec2 v_texcoord;

// Function to calculate distance from rounded rectangle edge
float roundedRectDistance(vec2 coord, vec2 size, float radius) {
  vec2 center = size * 0.5;
  vec2 pixelCoord = coord * size;
  vec2 toCorner = abs(pixelCoord - center) - (center - radius);
  float outsideCorner = length(max(toCorner, 0.0));
  float insideCorner = min(max(toCorner.x, toCorner.y), 0.0);
  return (outsideCorner + insideCorner - radius);
}

// Function to calculate distance from circle edge (negative inside, positive outside)
float circleDistance(vec2 coord, vec2 size, float radius) {
  vec2 center = vec2(0.5, 0.5);
  vec2 pixelCoord = coord * size;
  vec2 centerPixel = center * size;
  float distFromCenter = length(pixelCoord - centerPixel);
  return distFromCenter - radius;
}

// Check if this is a pill (border radius is approximately 50% of height AND width > height)
bool isPill(vec2 size, float radius) {
  float heightRatioDiff = abs(radius - size.y * 0.5);
  bool radiusMatchesHeight = heightRatioDiff < 2.0;
  bool isWiderThanTall = size.x > size.y + 4.0;
  return radiusMatchesHeight && isWiderThanTall;
}

// Check if this is a circle (border radius is approximately 50% of smaller dimension AND roughly square)
bool isCircle(vec2 size, float radius) {
  float minDim = min(size.x, size.y);
  bool radiusMatchesMinDim = abs(radius - minDim * 0.5) < 1.0;
  bool isRoughlySquare = abs(size.x - size.y) < 4.0;
  return radiusMatchesMinDim && isRoughlySquare;
}

// Function to calculate distance from pill edge (capsule shape)
float pillDistance(vec2 coord, vec2 size, float radius) {
  vec2 center = size * 0.5;
  vec2 pixelCoord = coord * size;
  vec2 capsuleStart = vec2(radius, center.y);
  vec2 capsuleEnd = vec2(size.x - radius, center.y);
  vec2 capsuleAxis = capsuleEnd - capsuleStart;
  float capsuleLength = length(capsuleAxis);
  
  if (capsuleLength > 0.0) {
    vec2 toPoint = pixelCoord - capsuleStart;
    float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
    vec2 closestPointOnAxis = capsuleStart + t * capsuleAxis;
    return length(pixelCoord - closestPointOnAxis) - radius;
  } else {
    return length(pixelCoord - center) - radius;
  }
}

void main() {
  vec2 coord = v_texcoord;
  float scrollY = u_scrollY;
  vec2 containerSize = u_resolution;
  vec2 textureSize = u_textureSize;
  
  // Container position in viewport coordinates
  vec2 containerCenter = u_containerPosition + vec2(0.0, scrollY);
  
  // Convert container coordinates to page coordinates
  vec2 containerOffset = (coord - 0.5) * containerSize;
  vec2 pagePixel = containerCenter + containerOffset;
  
  // Convert to texture coordinate (0 to 1)
  vec2 textureCoord = pagePixel / textureSize;
  
  // Glass refraction effects
  float distFromEdgeShape;
  vec2 shapeNormal;
  
  if (isPill(u_resolution, u_borderRadius)) {
    distFromEdgeShape = -pillDistance(coord, u_resolution, u_borderRadius);
    vec2 center = vec2(0.5, 0.5);
    vec2 pixelCoord = coord * u_resolution;
    vec2 capsuleStart = vec2(u_borderRadius, center.y * u_resolution.y);
    vec2 capsuleEnd = vec2(u_resolution.x - u_borderRadius, center.y * u_resolution.y);
    vec2 capsuleAxis = capsuleEnd - capsuleStart;
    float capsuleLength = length(capsuleAxis);
    
    if (capsuleLength > 0.0) {
      vec2 toPoint = pixelCoord - capsuleStart;
      float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
      vec2 closestPointOnAxis = capsuleStart + t * capsuleAxis;
      vec2 normalDir = pixelCoord - closestPointOnAxis;
      shapeNormal = length(normalDir) > 0.0 ? normalize(normalDir) : vec2(0.0, 1.0);
    } else {
      shapeNormal = normalize(coord - center);
    }
  } else if (isCircle(u_resolution, u_borderRadius)) {
    distFromEdgeShape = -circleDistance(coord, u_resolution, u_borderRadius);
    vec2 center = vec2(0.5, 0.5);
    shapeNormal = normalize(coord - center);
  } else {
    distFromEdgeShape = -roundedRectDistance(coord, u_resolution, u_borderRadius);
    vec2 center = vec2(0.5, 0.5);
    shapeNormal = normalize(coord - center);
  }
  
  distFromEdgeShape = max(distFromEdgeShape, 0.0);
  
  float distFromLeft = coord.x;
  float distFromRight = 1.0 - coord.x;
  float distFromTop = coord.y;
  float distFromBottom = 1.0 - coord.y;
  float distFromEdge = distFromEdgeShape / min(u_resolution.x, u_resolution.y);
  
  // Smooth glass refraction using shape-aware normal
  float normalizedDistance = distFromEdge * min(u_resolution.x, u_resolution.y);
  float baseIntensity = 1.0 - exp(-normalizedDistance * u_baseDistance);
  float edgeIntensity = exp(-normalizedDistance * u_edgeDistance);
  float rimIntensity = exp(-normalizedDistance * u_rimDistance);
  
  // Apply center warping only if warp is enabled, keep edge and rim effects always
  float baseComponent = u_warp > 0.5 ? baseIntensity * u_baseIntensity : 0.0;
  float totalIntensity = baseComponent + edgeIntensity * u_edgeIntensity + rimIntensity * u_rimIntensity;
  
  vec2 baseRefraction = shapeNormal * totalIntensity;
  
  float cornerProximityX = min(distFromLeft, distFromRight);
  float cornerProximityY = min(distFromTop, distFromBottom);
  float cornerDistance = max(cornerProximityX, cornerProximityY);
  float cornerNormalized = cornerDistance * min(u_resolution.x, u_resolution.y);
  
  float cornerBoost = exp(-cornerNormalized * 0.3) * u_cornerBoost;
  vec2 cornerRefraction = shapeNormal * cornerBoost;
  
  vec2 perpendicular = vec2(-shapeNormal.y, shapeNormal.x);
  float rippleEffect = sin(distFromEdge * 25.0) * u_rippleEffect * rimIntensity;
  vec2 textureRefraction = perpendicular * rippleEffect;
  
  vec2 totalRefraction = baseRefraction + cornerRefraction + textureRefraction;
  textureCoord += totalRefraction;
  
  // Gaussian blur (bilinear-optimized 5x5 tap kernel)
  vec4 color = vec4(0.0);
  vec2 texelSize = 1.0 / u_textureSize;
  float sigma = max(0.5, u_blurRadius * 0.5);
  float invTwoSigmaSq = -1.0 / (2.0 * sigma * sigma);
  vec2 blurStep = texelSize * sigma;
  
  float totalWeight = 0.0;
  for(float i = -4.0; i <= 4.0; i += 2.0) {
    for(float j = -4.0; j <= 4.0; j += 2.0) {
      float distSq = i * i + j * j;
      if(distSq > 25.0) continue;
      
      float weight = exp(distSq * invTwoSigmaSq);
      vec2 offset = vec2(i, j) * blurStep;
      color += texture2D(u_image, textureCoord + offset) * weight;
      totalWeight += weight;
    }
  }
  color /= totalWeight;
  
  // Shape mask (rounded rectangle, circle, or pill)
  float maskDistance;
  if (isPill(u_resolution, u_borderRadius)) {
    maskDistance = pillDistance(coord, u_resolution, u_borderRadius);
  } else if (isCircle(u_resolution, u_borderRadius)) {
    maskDistance = circleDistance(coord, u_resolution, u_borderRadius);
  } else {
    maskDistance = roundedRectDistance(coord, u_resolution, u_borderRadius);
  }
  float mask = 1.0 - smoothstep(-1.0, 1.0, maskDistance);

  // Specular rim reflection (confined strictly to 2.5px border of the glass)
  float edgeFactor = 1.0 - smoothstep(0.0, 2.5, normalizedDistance);
  float rimLight = edgeFactor * 0.45;
  vec3 specularColor = vec3(1.0, 1.0, 1.0) * rimLight;
  
  // Crystal dark glass body
  vec3 glassBody = mix(color.rgb, vec3(0.07, 0.08, 0.12), 0.65);
  vec3 finalColor = glassBody + specularColor;
  
  // Alpha: translucent 0.15 in center, 0.40 at rim
  float glassAlpha = mask * (0.15 + rimLight * 0.55);
  gl_FragColor = vec4(finalColor, glassAlpha);
}
`;

export const NESTED_FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_textureSize;
uniform float u_blurRadius;
uniform float u_borderRadius;
uniform vec2 u_buttonPosition;
uniform vec2 u_containerPosition;
uniform vec2 u_containerSize;
uniform float u_warp;
uniform float u_edgeIntensity;
uniform float u_rimIntensity;
uniform float u_baseIntensity;
uniform float u_edgeDistance;
uniform float u_rimDistance;
uniform float u_baseDistance;
uniform float u_cornerBoost;
uniform float u_rippleEffect;
uniform float u_tintOpacity;
varying vec2 v_texcoord;

float roundedRectDistance(vec2 coord, vec2 size, float radius) {
  vec2 center = size * 0.5;
  vec2 pixelCoord = coord * size;
  vec2 toCorner = abs(pixelCoord - center) - (center - radius);
  float outsideCorner = length(max(toCorner, 0.0));
  float insideCorner = min(max(toCorner.x, toCorner.y), 0.0);
  return (outsideCorner + insideCorner - radius);
}

float circleDistance(vec2 coord, vec2 size, float radius) {
  vec2 center = vec2(0.5, 0.5);
  vec2 pixelCoord = coord * size;
  vec2 centerPixel = center * size;
  float distFromCenter = length(pixelCoord - centerPixel);
  return distFromCenter - radius;
}

bool isPill(vec2 size, float radius) {
  float heightRatioDiff = abs(radius - size.y * 0.5);
  bool radiusMatchesHeight = heightRatioDiff < 2.0;
  bool isWiderThanTall = size.x > size.y + 4.0;
  return radiusMatchesHeight && isWiderThanTall;
}

bool isCircle(vec2 size, float radius) {
  float minDim = min(size.x, size.y);
  bool radiusMatchesMinDim = abs(radius - minDim * 0.5) < 1.0;
  bool isRoughlySquare = abs(size.x - size.y) < 4.0;
  return radiusMatchesMinDim && isRoughlySquare;
}

float pillDistance(vec2 coord, vec2 size, float radius) {
  vec2 center = size * 0.5;
  vec2 pixelCoord = coord * size;
  vec2 capsuleStart = vec2(radius, center.y);
  vec2 capsuleEnd = vec2(size.x - radius, center.y);
  vec2 capsuleAxis = capsuleEnd - capsuleStart;
  float capsuleLength = length(capsuleAxis);
  
  if (capsuleLength > 0.0) {
    vec2 toPoint = pixelCoord - capsuleStart;
    float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
    vec2 closestPointOnAxis = capsuleStart + t * capsuleAxis;
    return length(pixelCoord - closestPointOnAxis) - radius;
  } else {
    return length(pixelCoord - center) - radius;
  }
}

void main() {
  vec2 coord = v_texcoord;
  vec2 buttonSize = u_resolution;
  vec2 containerSize = u_containerSize;
  
  // Convert screen positions to container-relative coordinates
  vec2 containerTopLeft = u_containerPosition - containerSize * 0.5;
  vec2 buttonTopLeft = u_buttonPosition - buttonSize * 0.5;
  vec2 buttonRelativePos = buttonTopLeft - containerTopLeft;
  vec2 buttonPixel = coord * buttonSize;
  vec2 containerPixel = buttonRelativePos + buttonPixel;
  vec2 baseTextureCoord = containerPixel / containerSize;
  
  // Button's own glass effects
  float distFromEdgeShape;
  vec2 shapeNormal;
  
  if (isPill(u_resolution, u_borderRadius)) {
    distFromEdgeShape = -pillDistance(coord, u_resolution, u_borderRadius);
    vec2 center = vec2(0.5, 0.5);
    vec2 pixelCoord = coord * u_resolution;
    vec2 capsuleStart = vec2(u_borderRadius, center.y * u_resolution.y);
    vec2 capsuleEnd = vec2(u_resolution.x - u_borderRadius, center.y * u_resolution.y);
    vec2 capsuleAxis = capsuleEnd - capsuleStart;
    float capsuleLength = length(capsuleAxis);
    
    if (capsuleLength > 0.0) {
      vec2 toPoint = pixelCoord - capsuleStart;
      float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
      vec2 closestPointOnAxis = capsuleStart + t * capsuleAxis;
      vec2 normalDir = pixelCoord - closestPointOnAxis;
      shapeNormal = length(normalDir) > 0.0 ? normalize(normalDir) : vec2(0.0, 1.0);
    } else {
      shapeNormal = normalize(coord - center);
    }
  } else if (isCircle(u_resolution, u_borderRadius)) {
    distFromEdgeShape = -circleDistance(coord, u_resolution, u_borderRadius);
    vec2 center = vec2(0.5, 0.5);
    shapeNormal = normalize(coord - center);
  } else {
    distFromEdgeShape = -roundedRectDistance(coord, u_resolution, u_borderRadius);
    vec2 center = vec2(0.5, 0.5);
    shapeNormal = normalize(coord - center);
  }
  
  distFromEdgeShape = max(distFromEdgeShape, 0.0);
  
  float distFromLeft = coord.x;
  float distFromRight = 1.0 - coord.x;
  float distFromTop = coord.y;
  float distFromBottom = 1.0 - coord.y;
  float distFromEdge = distFromEdgeShape / min(u_resolution.x, u_resolution.y);
  
  float normalizedDistance = distFromEdge * min(u_resolution.x, u_resolution.y);
  float baseIntensity = 1.0 - exp(-normalizedDistance * u_baseDistance);
  float edgeIntensity = exp(-normalizedDistance * u_edgeDistance);
  float rimIntensity = exp(-normalizedDistance * u_rimDistance);
  
  float baseComponent = u_warp > 0.5 ? baseIntensity * u_baseIntensity : 0.0;
  float totalIntensity = baseComponent + edgeIntensity * u_edgeIntensity + rimIntensity * u_rimIntensity;
  
  vec2 baseRefraction = shapeNormal * totalIntensity;
  
  float cornerProximityX = min(distFromLeft, distFromRight);
  float cornerProximityY = min(distFromTop, distFromBottom);
  float cornerDistance = max(cornerProximityX, cornerProximityY);
  float cornerNormalized = cornerDistance * min(u_resolution.x, u_resolution.y);
  
  float cornerBoost = exp(-cornerNormalized * 0.3) * u_cornerBoost;
  vec2 cornerRefraction = shapeNormal * cornerBoost;
  
  vec2 perpendicular = vec2(-shapeNormal.y, shapeNormal.x);
  float rippleEffect = sin(distFromEdge * 25.0) * u_rippleEffect * rimIntensity;
  vec2 textureRefraction = perpendicular * rippleEffect;
  
  vec2 totalRefraction = baseRefraction + cornerRefraction + textureRefraction;
  
  // Convert button pixel refraction to container texture space
  vec2 textureCoord = baseTextureCoord + totalRefraction * (buttonSize / containerSize);
  
  // Gaussian blur (bilinear-optimized 5x5 tap kernel)
  vec4 color = vec4(0.0);
  vec2 texelSize = 1.0 / u_textureSize;
  float sigma = max(0.5, u_blurRadius * 0.5);
  float invTwoSigmaSq = -1.0 / (2.0 * sigma * sigma);
  vec2 blurStep = texelSize * sigma;
  
  float totalWeight = 0.0;
  for(float i = -4.0; i <= 4.0; i += 2.0) {
    for(float j = -4.0; j <= 4.0; j += 2.0) {
      float distSq = i * i + j * j;
      if(distSq > 25.0) continue;
      
      float weight = exp(distSq * invTwoSigmaSq);
      vec2 offset = vec2(i, j) * blurStep;
      color += texture2D(u_image, textureCoord + offset) * weight;
      totalWeight += weight;
    }
  }
  color /= totalWeight;
  
  float gradientPosition = coord.y;
  vec3 topTint = vec3(1.0, 1.0, 1.0);
  vec3 bottomTint = vec3(0.7, 0.7, 0.7);
  vec3 gradientTint = mix(topTint, bottomTint, gradientPosition);
  vec3 tintedColor = mix(color.rgb, gradientTint, u_tintOpacity * 0.7);
  color = vec4(tintedColor, color.a);
  
  // Sample container texture colors for second ambient gradient
  vec2 viewportCenter = u_buttonPosition;
  float topY = max(0.0, (viewportCenter.y - buttonSize.y * 0.4) / containerSize.y);
  float midY = viewportCenter.y / containerSize.y;
  float bottomY = min(1.0, (viewportCenter.y + buttonSize.y * 0.4) / containerSize.y);
  
  vec3 topColor = texture2D(u_image, vec2(0.5, topY)).rgb;
  vec3 midColor = texture2D(u_image, vec2(0.5, midY)).rgb;
  vec3 bottomColor = texture2D(u_image, vec2(0.5, bottomY)).rgb;
  
  vec3 sampledGradient;
  if (gradientPosition < 0.1) {
    sampledGradient = topColor;
  } else if (gradientPosition > 0.9) {
    sampledGradient = bottomColor;
  } else {
    float transitionPos = (gradientPosition - 0.1) / 0.8;
    if (transitionPos < 0.5) {
      float t = transitionPos * 2.0;
      sampledGradient = mix(topColor, midColor, t);
    } else {
      float t = (transitionPos - 0.5) * 2.0;
      sampledGradient = mix(midColor, bottomColor, t);
    }
  }
  
  vec3 secondTinted = mix(color.rgb, sampledGradient, u_tintOpacity * 0.4);
  vec3 buttonTopTint = vec3(1.08, 1.08, 1.08);
  vec3 buttonBottomTint = vec3(0.92, 0.92, 0.92);
  vec3 buttonGradient = mix(buttonTopTint, buttonBottomTint, gradientPosition);
  vec3 finalTinted = secondTinted * buttonGradient;
  
  // Shape mask (rounded rectangle, circle, or pill)
  float maskDistance;
  if (isPill(u_resolution, u_borderRadius)) {
    maskDistance = pillDistance(coord, u_resolution, u_borderRadius);
  } else if (isCircle(u_resolution, u_borderRadius)) {
    maskDistance = circleDistance(coord, u_resolution, u_borderRadius);
  } else {
    maskDistance = roundedRectDistance(coord, u_resolution, u_borderRadius);
  }
  float mask = 1.0 - smoothstep(-1.0, 1.0, maskDistance);
  
  // Specular rim reflection (confined strictly to 2.5px border of the button)
  float edgeFactor = 1.0 - smoothstep(0.0, 2.5, normalizedDistance);
  float buttonRimLight = edgeFactor * 0.45;
  vec3 buttonSpecular = vec3(1.0, 1.0, 1.0) * buttonRimLight;
  vec3 buttonBody = mix(finalTinted, vec3(0.09, 0.10, 0.15), 0.60);
  vec3 finalButtonColor = buttonBody + buttonSpecular;
  
  float buttonAlpha = mask * (0.18 + buttonRimLight * 0.55);
  gl_FragColor = vec4(finalButtonColor, buttonAlpha);
}
`;
