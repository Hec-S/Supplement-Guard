# Visual Diff Indicators Design

## Overview

This document outlines the design for sophisticated visual diff indicators that provide clear, intuitive before/after state comparisons throughout the OCR-based comparison system. The system employs multiple visualization techniques to highlight changes, including side-by-side comparisons, overlay modes, and animated transitions.

## Current State Analysis

### Existing Limitations
- **Basic Change Indicators**: Simple color coding without detailed comparison
- **No Before/After Visualization**: Missing clear state transitions
- **Limited Diff Granularity**: Cannot see specific field-level changes
- **Static Comparisons**: No interactive exploration of changes
- **Poor Change Context**: Difficult to understand the magnitude of changes
- **Missing Visual Hierarchy**: All changes appear equally important

## Visual Diff Architecture

### 1. Diff Visualization Types

#### Core Diff Modes
```typescript
enum DiffMode {
  SIDE_BY_SIDE = 'side-by-side',     // Original | Supplement
  OVERLAY = 'overlay',               // Transparent overlay showing changes
  INLINE = 'inline',                 // GitHub-style inline diffs
  ANIMATED = 'animated',             // Smooth transitions between states
  SPLIT_VIEW = 'split-view',         // Vertical split comparison
  UNIFIED = 'unified',               // Single view with change indicators
  HEATMAP = 'heatmap',              // Color intensity based on change magnitude
  TIMELINE = 'timeline'              // Temporal progression of changes
}

interface DiffVisualization {
  id: string;
  mode: DiffMode;
  target: DiffTarget;
  comparison: StateComparison;
  styling: DiffStyling;
  interactions: DiffInteraction[];
  animations: DiffAnimation;
  accessibility: DiffAccessibility;
  performance: DiffPerformance;
}

interface DiffTarget {
  type: 'line-item' | 'field' | 'section' | 'document';
  elementId: string;
  scope: DiffScope;
  granularity: DiffGranularity;
  context: DiffContext;
}

enum DiffGranularity {
  CHARACTER = 'character',           // Character-level differences
  WORD = 'word',                     // Word-level differences
  FIELD = 'field',                   // Field-level differences
  ITEM = 'item',                     // Item-level differences
  SECTION = 'section',               // Section-level differences
  DOCUMENT = 'document'              // Document-level differences
}
```

#### State Comparison Model
```typescript
interface StateComparison {
  beforeState: ItemState;
  afterState: ItemState;
  differences: StateDifference[];
  metadata: ComparisonMetadata;
  confidence: number;
  timestamp: Date;
}

interface StateDifference {
  field: string;
  type: DifferenceType;
  beforeValue: any;
  afterValue: any;
  magnitude: number;              // 0-1 scale of change significance
  impact: ChangeImpact;
  visualization: DiffVisualization;
  explanation: string;
}

enum DifferenceType {
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
  MOVED = 'moved',
  RENAMED = 'renamed',
  TYPE_CHANGED = 'type-changed',
  FORMAT_CHANGED = 'format-changed',
  CALCULATION_CHANGED = 'calculation-changed'
}

interface ChangeImpact {
  financial: number;              // Dollar impact
  percentage: number;             // Percentage change
  risk: SeverityLevel;           // Risk assessment
  category: ImpactCategory;       // Type of impact
  cascading: CascadingEffect[];   // Related changes
}

enum ImpactCategory {
  COST_INCREASE = 'cost-increase',
  COST_DECREASE = 'cost-decrease',
  SCOPE_CHANGE = 'scope-change',
  QUALITY_CHANGE = 'quality-change',
  TIMELINE_CHANGE = 'timeline-change',
  COMPLIANCE_CHANGE = 'compliance-change'
}
```

### 2. Side-by-Side Comparison

#### Dual-Pane Layout
```typescript
interface SideBySideComparison {
  layout: DualPaneLayout;
  synchronization: PaneSynchronization;
  highlighting: ComparisonHighlighting;
  navigation: ComparisonNavigation;
  interactions: PaneInteraction[];
}

interface DualPaneLayout {
  orientation: 'horizontal' | 'vertical';
  splitRatio: number;             // 0.5 for equal split
  resizable: boolean;
  minPaneSize: number;
  maxPaneSize: number;
  gutter: GutterConfig;
}

interface PaneSynchronization {
  scrolling: boolean;             // Synchronized scrolling
  selection: boolean;             // Synchronized selection
  highlighting: boolean;          // Synchronized highlighting
  navigation: boolean;            // Synchronized navigation
  zoom: boolean;                  // Synchronized zoom level
}

interface ComparisonHighlighting {
  addedContent: HighlightStyle;
  removedContent: HighlightStyle;
  modifiedContent: HighlightStyle;
  unchangedContent: HighlightStyle;
  connectors: ConnectorStyle[];
}

interface ConnectorStyle {
  type: 'line' | 'arrow' | 'curve' | 'block';
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  animation?: AnimationConfig;
}
```

#### Field-Level Comparisons
```typescript
interface FieldComparison {
  field: string;
  beforeValue: FieldValue;
  afterValue: FieldValue;
  difference: FieldDifference;
  visualization: FieldVisualization;
  validation: FieldValidation;
}

interface FieldValue {
  raw: any;
  formatted: string;
  type: FieldType;
  metadata: FieldMetadata;
  confidence: number;
}

interface FieldDifference {
  type: DifferenceType;
  magnitude: number;
  significance: DifferenceSignificance;
  explanation: string;
  suggestions: string[];
}

enum DifferenceSignificance {
  TRIVIAL = 'trivial',           // Formatting, whitespace
  MINOR = 'minor',               // Small value changes
  MODERATE = 'moderate',         // Noticeable changes
  MAJOR = 'major',               // Significant changes
  CRITICAL = 'critical'          // Business-critical changes
}

interface FieldVisualization {
  beforeDisplay: DisplayConfig;
  afterDisplay: DisplayConfig;
  transition: TransitionConfig;
  highlighting: HighlightConfig;
  annotations: AnnotationConfig[];
}
```

### 3. Overlay Diff Mode

#### Transparent Overlay System
```typescript
interface OverlayDiff {
  baseLayer: LayerConfig;
  overlayLayer: LayerConfig;
  blending: BlendingConfig;
  opacity: OpacityConfig;
  masking: MaskingConfig;
  interactions: OverlayInteraction[];
}

interface LayerConfig {
  content: LayerContent;
  styling: LayerStyling;
  positioning: LayerPositioning;
  visibility: VisibilityConfig;
  zIndex: number;
}

interface BlendingConfig {
  mode: BlendMode;
  opacity: number;
  filters: BlendFilter[];
  transitions: BlendTransition[];
}

enum BlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  SOFT_LIGHT = 'soft-light',
  HARD_LIGHT = 'hard-light',
  COLOR_DODGE = 'color-dodge',
  COLOR_BURN = 'color-burn',
  DIFFERENCE = 'difference',
  EXCLUSION = 'exclusion'
}

interface OverlayInteraction {
  type: 'hover' | 'click' | 'drag' | 'scroll';
  effect: OverlayEffect;
  trigger: InteractionTrigger;
  feedback: InteractionFeedback;
}

enum OverlayEffect {
  REVEAL = 'reveal',              // Reveal underlying layer
  HIGHLIGHT = 'highlight',        // Highlight differences
  ISOLATE = 'isolate',           // Show only changes
  ANIMATE = 'animate',           // Animate transitions
  COMPARE = 'compare'            // Side-by-side comparison
}
```

#### Interactive Reveal Controls
```typescript
interface RevealControls {
  slider: SliderControl;
  buttons: RevealButton[];
  gestures: RevealGesture[];
  automation: AutoReveal;
}

interface SliderControl {
  orientation: 'horizontal' | 'vertical';
  position: ControlPosition;
  range: { min: number; max: number };
  step: number;
  markers: SliderMarker[];
  styling: SliderStyling;
}

interface RevealButton {
  label: string;
  icon: string;
  action: RevealAction;
  position: ControlPosition;
  styling: ButtonStyling;
}

enum RevealAction {
  SHOW_BEFORE = 'show-before',
  SHOW_AFTER = 'show-after',
  SHOW_DIFF = 'show-diff',
  TOGGLE = 'toggle',
  ANIMATE = 'animate',
  RESET = 'reset'
}
```

### 4. Inline Diff Visualization

#### GitHub-Style Inline Diffs
```typescript
interface InlineDiff {
  lines: DiffLine[];
  context: ContextConfig;
  formatting: InlineFormatting;
  navigation: InlineNavigation;
  search: DiffSearch;
}

interface DiffLine {
  number: number;
  type: LineType;
  content: LineContent;
  changes: InlineChange[];
  metadata: LineMetadata;
}

enum LineType {
  UNCHANGED = 'unchanged',
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
  CONTEXT = 'context',
  SEPARATOR = 'separator'
}

interface InlineChange {
  type: ChangeType;
  position: { start: number; end: number };
  content: string;
  replacement?: string;
  styling: ChangeStyling;
}

interface InlineFormatting {
  lineNumbers: boolean;
  wordWrap: boolean;
  whitespace: WhitespaceHandling;
  syntax: SyntaxHighlighting;
  minimap: MinimapConfig;
}

enum WhitespaceHandling {
  SHOW = 'show',
  HIDE = 'hide',
  HIGHLIGHT = 'highlight',
  NORMALIZE = 'normalize'
}
```

#### Change Navigation
```typescript
interface ChangeNavigation {
  jumpToNext: NavigationAction;
  jumpToPrevious: NavigationAction;
  jumpToFirst: NavigationAction;
  jumpToLast: NavigationAction;
  filter: NavigationFilter;
  bookmarks: NavigationBookmark[];
}

interface NavigationAction {
  enabled: boolean;
  shortcut: KeyboardShortcut;
  button: NavigationButton;
  behavior: NavigationBehavior;
}

interface NavigationFilter {
  changeTypes: DifferenceType[];
  significance: DifferenceSignificance[];
  fields: string[];
  customFilters: CustomFilter[];
}
```

### 5. Animated Transitions

#### Smooth State Transitions
```typescript
interface AnimatedDiff {
  timeline: AnimationTimeline;
  keyframes: AnimationKeyframe[];
  easing: EasingFunction;
  controls: AnimationControls;
  events: AnimationEvent[];
}

interface AnimationTimeline {
  duration: number;
  delay: number;
  iterations: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
}

interface AnimationKeyframe {
  time: number;                   // 0-1 timeline position
  state: AnimationState;
  easing: EasingFunction;
  properties: AnimatedProperty[];
}

interface AnimatedProperty {
  name: string;
  fromValue: any;
  toValue: any;
  interpolation: InterpolationType;
  transform: TransformFunction;
}

enum InterpolationType {
  LINEAR = 'linear',
  DISCRETE = 'discrete',
  BEZIER = 'bezier',
  SPRING = 'spring',
  ELASTIC = 'elastic',
  BOUNCE = 'bounce'
}

interface AnimationControls {
  play: boolean;
  pause: boolean;
  stop: boolean;
  reverse: boolean;
  speed: number;
  scrubbing: boolean;
}
```

#### Morphing Visualizations
```typescript
interface MorphingVisualization {
  source: VisualElement;
  target: VisualElement;
  morphing: MorphingConfig;
  constraints: MorphingConstraint[];
  optimization: MorphingOptimization;
}

interface MorphingConfig {
  algorithm: MorphingAlgorithm;
  steps: number;
  smoothing: SmoothingConfig;
  preservation: PreservationConfig;
}

enum MorphingAlgorithm {
  LINEAR = 'linear',
  BEZIER = 'bezier',
  SPLINE = 'spline',
  ELASTIC = 'elastic',
  PHYSICS = 'physics',
  CUSTOM = 'custom'
}

interface PreservationConfig {
  aspectRatio: boolean;
  proportions: boolean;
  topology: boolean;
  semantics: boolean;
}
```

### 6. Heatmap Visualization

#### Change Intensity Mapping
```typescript
interface HeatmapDiff {
  data: HeatmapData;
  colorScale: ColorScale;
  intensity: IntensityConfig;
  clustering: ClusteringConfig;
  interactions: HeatmapInteraction[];
}

interface HeatmapData {
  points: HeatmapPoint[];
  bounds: HeatmapBounds;
  resolution: HeatmapResolution;
  aggregation: AggregationMethod;
}

interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  metadata: PointMetadata;
  category: string;
}

interface ColorScale {
  type: ColorScaleType;
  colors: string[];
  domain: [number, number];
  interpolation: ColorInterpolation;
  accessibility: AccessibleColors;
}

enum ColorScaleType {
  LINEAR = 'linear',
  LOGARITHMIC = 'logarithmic',
  POWER = 'power',
  QUANTILE = 'quantile',
  THRESHOLD = 'threshold',
  ORDINAL = 'ordinal'
}

interface IntensityConfig {
  radius: number;
  blur: number;
  maxOpacity: number;
  minOpacity: number;
  gradient: GradientConfig;
}
```

#### Interactive Heatmap Features
```typescript
interface HeatmapInteraction {
  hover: HoverConfig;
  click: ClickConfig;
  zoom: ZoomConfig;
  selection: SelectionConfig;
  filtering: FilterConfig;
}

interface HoverConfig {
  enabled: boolean;
  tooltip: TooltipConfig;
  highlighting: HighlightConfig;
  crosshairs: CrosshairConfig;
}

interface ZoomConfig {
  enabled: boolean;
  minZoom: number;
  maxZoom: number;
  wheelZoom: boolean;
  pinchZoom: boolean;
  boxZoom: boolean;
}
```

### 7. Performance Optimization

#### Efficient Diff Rendering
```typescript
interface DiffPerformance {
  virtualization: VirtualizationConfig;
  caching: CachingStrategy;
  lazy: LazyLoadingConfig;
  optimization: RenderOptimization;
  monitoring: PerformanceMonitoring;
}

interface VirtualizationConfig {
  enabled: boolean;
  itemHeight: number;
  overscan: number;
  threshold: number;
  recycling: boolean;
}

interface RenderOptimization {
  batching: boolean;
  debouncing: number;
  throttling: number;
  memoization: boolean;
  webWorkers: boolean;
}

interface PerformanceMonitoring {
  metrics: PerformanceMetric[];
  thresholds: PerformanceThreshold[];
  alerts: PerformanceAlert[];
  profiling: ProfilingConfig;
}
```

#### Memory Management
```typescript
interface DiffMemoryManagement {
  pooling: ObjectPooling;
  cleanup: CleanupStrategy;
  limits: MemoryLimits;
  monitoring: MemoryMonitoring;
}

interface ObjectPooling {
  enabled: boolean;
  poolSize: number;
  objectTypes: PooledObjectType[];
  recycling: RecyclingStrategy;
}

interface CleanupStrategy {
  automatic: boolean;
  interval: number;
  triggers: CleanupTrigger[];
  retention: RetentionPolicy;
}
```

### 8. Accessibility Features

#### Screen Reader Support
```typescript
interface DiffAccessibility {
  screenReader: ScreenReaderConfig;
  keyboard: KeyboardNavigation;
  focus: FocusManagement;
  announcements: AnnouncementConfig;
  alternatives: AlternativeFormats;
}

interface ScreenReaderConfig {
  diffAnnouncements: boolean;
  changeDescriptions: boolean;
  navigationHelp: boolean;
  structuralInfo: boolean;
  liveRegions: boolean;
}

interface AlternativeFormats {
  textSummary: boolean;
  audioDescription: boolean;
  tactileFeedback: boolean;
  highContrast: boolean;
  largeText: boolean;
}
```

#### Keyboard Navigation
```typescript
interface DiffKeyboardNavigation {
  shortcuts: DiffShortcut[];
  tabOrder: TabOrderConfig;
  focusTrapping: boolean;
  skipLinks: SkipLinkConfig[];
}

interface DiffShortcut {
  key: string;
  modifiers: KeyModifier[];
  action: DiffAction;
  description: string;
  context: ShortcutContext;
}

enum DiffAction {
  NEXT_CHANGE = 'next-change',
  PREV_CHANGE = 'prev-change',
  TOGGLE_MODE = 'toggle-mode',
  ZOOM_IN = 'zoom-in',
  ZOOM_OUT = 'zoom-out',
  RESET_VIEW = 'reset-view',
  EXPORT_DIFF = 'export-diff'
}
```

## Implementation Strategy

### Phase 1: Core Diff Visualization (Weeks 1-2)
- Side-by-side comparison implementation
- Basic inline diff functionality
- Essential highlighting and styling
- Performance optimizations

### Phase 2: Advanced Diff Modes (Weeks 3-4)
- Overlay diff implementation
- Animated transitions
- Heatmap visualization
- Interactive controls

### Phase 3: Accessibility and Polish (Weeks 5-6)
- Comprehensive accessibility features
- Advanced keyboard navigation
- Screen reader optimizations
- Mobile responsiveness

### Phase 4: Integration and Testing (Weeks 7-8)
- Component integration
- Performance benchmarking
- Cross-browser testing
- Documentation and examples

## Success Metrics

### User Experience Metrics
- **Change Recognition**: <2s to identify specific changes
- **Diff Navigation**: >90% successful navigation between changes
- **Mode Preference**: User preference distribution across diff modes
- **Task Completion**: >30% faster change analysis

### Technical Metrics
- **Render Performance**: <100ms for diff visualization
- **Memory Usage**: <15MB for complex diffs
- **Accuracy**: >99% correct change detection
- **Browser Compatibility**: 99%+ across target browsers

### Accessibility Metrics
- **Screen Reader**: 100% navigable with screen readers
- **Keyboard Navigation**: 100% keyboard accessible
- **Color Contrast**: WCAG 2.1 AA compliance
- **Alternative Formats**: Available for all diff types

This comprehensive visual diff system will provide users with powerful, intuitive tools for understanding and analyzing changes between document states, significantly improving the efficiency and accuracy of the comparison process.