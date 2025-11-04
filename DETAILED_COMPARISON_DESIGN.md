# Detailed Line-by-Line Comparison Analysis Design

## Overview
Enhancement to the EnhancedComparisonTable component to provide a detailed line-by-line comparison analysis with specific formatting requirements for price changes, organized by supplement line item names.

## Design Requirements

### Formatting Specifications

#### For Existing Line Items with Price Increases:
```
[Supplement Line Item Name]
  + $[increase amount] | $[original amount] → $[new amount] | **CHANGED**
```
Example: `Labor - Engine Repair + $150.00 | $500.00 → $650.00 | **CHANGED**`

#### For Existing Line Items with Price Decreases:
```
[Supplement Line Item Name]
  - $[decrease amount] | $[original amount] → $[new amount] | **CHANGED**
```
Example: `Parts - Oil Filter - $25.00 | $75.00 → $50.00 | **CHANGED**`

#### For Newly Added Line Items:
```
[Supplement Line Item Name] (in red text)
  + $[full amount] | **NEW**
```
Example: `Additional Labor - Diagnostics + $200.00 | **NEW**`

### Visual Design Elements

#### Color Coding System:
- **Red (+)**: Price increases and new items
- **Green (-)**: Price decreases  
- **Bold labels**: "CHANGED", "NEW", "REMOVED"
- **Red text**: New line item names
- **Consistent alignment**: Proper spacing for easy scanning

#### Layout Structure:
```
┌─────────────────────────────────────────────────────────────┐
│ View Mode Toggle: [Table View] [Line-by-Line Analysis]     │
├─────────────────────────────────────────────────────────────┤
│ ## Labor Items                                              │
│   Engine Repair                                             │
│     🔴 + $150.00 | $500.00 → $650.00 | **CHANGED**        │
│                                                             │
│   🔴 Additional Diagnostics                                │
│     🔴 + $200.00 | **NEW**                                 │
│                                                             │
│ ## Parts Items                                              │
│   Oil Filter                                                │
│     🟢 - $25.00 | $75.00 → $50.00 | **CHANGED**           │
│                                                             │
│   🔴 Premium Air Filter                                    │
│     🔴 + $45.00 | **NEW**                                  │
└─────────────────────────────────────────────────────────────┘
```

## Technical Implementation Plan

### 1. Component Structure Enhancement

#### New Props Interface:
```typescript
interface EnhancedComparisonTableProps {
  analysis: ComparisonAnalysis;
  onItemSelect?: (itemId: string) => void;
  viewMode?: 'table' | 'line-by-line'; // New prop
  showViewToggle?: boolean; // New prop
}
```

#### New State Management:
```typescript
const [viewMode, setViewMode] = useState<'table' | 'line-by-line'>('table');
```

### 2. Data Organization by Categories

#### Group Items by Category:
```typescript
const itemsByCategory = useMemo(() => {
  const grouped = new Map<CostCategory, Array<ItemDisplayData>>();
  
  filteredAndSortedItems.forEach(item => {
    const category = item.supplement.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(item);
  });
  
  return grouped;
}, [filteredAndSortedItems]);
```

### 3. Line-by-Line Display Component

#### New Rendering Function:
```typescript
const renderLineByLineAnalysis = () => {
  return (
    <div className="space-y-6">
      {Array.from(itemsByCategory.entries()).map(([category, items]) => (
        <div key={category} className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
            {category.charAt(0).toUpperCase() + category.slice(1)} Items
          </h3>
          <div className="space-y-3">
            {items.map(item => renderLineItem(item))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### Individual Line Item Renderer:
```typescript
const renderLineItem = (item: ItemDisplayData) => {
  const isNew = item.type === 'new';
  const isRemoved = item.type === 'removed';
  const hasVariance = item.supplement.totalVariance !== 0;
  
  return (
    <div key={item.supplement.id} className="pl-4 border-l-2 border-slate-100">
      {/* Line item name */}
      <div className={`font-medium mb-1 ${isNew ? 'text-red-600' : 'text-slate-800'}`}>
        {item.supplement.description}
      </div>
      
      {/* Variance display */}
      <div className="flex items-center space-x-2 text-sm">
        {renderVarianceIndicator(item)}
      </div>
    </div>
  );
};
```

### 4. Variance Indicator Rendering

#### Variance Display Logic:
```typescript
const renderVarianceIndicator = (item: ItemDisplayData) => {
  if (item.type === 'new') {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-red-600 font-bold">+</span>
        <span className="text-red-600 font-semibold">{formatCurrency(item.supplement.total)}</span>
        <span className="text-slate-400">|</span>
        <span className="font-bold text-slate-800">NEW</span>
      </div>
    );
  }
  
  if (item.type === 'removed') {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-gray-600 font-bold">-</span>
        <span className="text-gray-600 font-semibold">{formatCurrency(item.supplement.total)}</span>
        <span className="text-slate-400">|</span>
        <span className="font-bold text-slate-800">REMOVED</span>
      </div>
    );
  }
  
  if (item.original && item.supplement.totalVariance !== 0) {
    const isIncrease = item.supplement.totalVariance > 0;
    const colorClass = isIncrease ? 'text-red-600' : 'text-green-600';
    const symbol = isIncrease ? '+' : '-';
    
    return (
      <div className="flex items-center space-x-2">
        <span className={`font-bold ${colorClass}`}>{symbol}</span>
        <span className={`font-semibold ${colorClass}`}>
          {formatCurrency(Math.abs(item.supplement.totalVariance))}
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-600">{formatCurrency(item.original.total)}</span>
        <span className="text-slate-400">→</span>
        <span className="text-slate-600">{formatCurrency(item.supplement.total)}</span>
        <span className="text-slate-400">|</span>
        <span className="font-bold text-slate-800">CHANGED</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-slate-400">No change</span>
    </div>
  );
};
```

### 5. View Toggle Implementation

#### Toggle Button Component:
```typescript
const ViewToggle = () => (
  <div className="flex bg-slate-100 rounded-lg p-1">
    <button
      onClick={() => setViewMode('table')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        viewMode === 'table'
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      Table View
    </button>
    <button
      onClick={() => setViewMode('line-by-line')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        viewMode === 'line-by-line'
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      Line-by-Line Analysis
    </button>
  </div>
);
```

## Implementation Benefits

### 1. Enhanced Readability
- Clear visual separation by categories
- Consistent formatting for easy scanning
- Color-coded variance indicators

### 2. Improved User Experience
- Toggle between detailed and tabular views
- Organized by logical groupings (categories)
- Proper alignment for quick comparison

### 3. Professional Presentation
- Consistent currency formatting
- Clear labeling (NEW, CHANGED, REMOVED)
- Proper visual hierarchy

### 4. Maintainability
- Reuses existing data structures
- Modular rendering functions
- Consistent with current component patterns

## Next Steps

1. Implement the view toggle functionality
2. Create the line-by-line rendering components
3. Add proper styling and alignment
4. Test with various data scenarios
5. Update component documentation

This design maintains backward compatibility while adding the requested detailed line-by-line comparison functionality with the specific formatting requirements.