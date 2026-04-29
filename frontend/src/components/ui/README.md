# UI Components

Base UI components for the Invoice Expense Manager application. All components are built with React, TypeScript, and TailwindCSS.

## Components

### Button
Reusable button component with three variants and loading state support.

**Variants:**
- `primary` (default) - Blue background
- `secondary` - Gray background
- `danger` - Red background

**States:**
- `loading` - Shows spinner and disables interaction
- `disabled` - Disables interaction

**Example:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" onClick={handleClick}>
  Save
</Button>

<Button variant="danger" loading>
  Deleting...
</Button>
```

### Input
Text input component with label and inline error message support.

**Types:**
- `text` (default)
- `number`
- `date`

**Example:**
```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="text"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
/>
```

### Select
Dropdown select component with typed options, label, and inline error support.

**Example:**
```tsx
import { Select } from '@/components/ui';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

<Select
  label="Category"
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  placeholder="Select a category"
  error={errors.category}
/>
```

### Modal
Modal dialog with overlay, title, content area, and optional action buttons.

**Features:**
- Close with Escape key
- Close by clicking outside (on overlay)
- Prevents body scroll when open
- Accessible with proper ARIA attributes

**Example:**
```tsx
import { Modal, Button } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Delete"
  actions={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
    </>
  }
>
  <p>Are you sure you want to delete this item?</p>
</Modal>
```

### Badge
Status badge component with color-coded styling based on invoice status.

**Status Colors:**
- `pending` - Yellow
- `reviewed` - Blue
- `approved` - Green

**Example:**
```tsx
import { Badge } from '@/components/ui';

<Badge status="pending" />
<Badge status="reviewed" />
<Badge status="approved" />
```

### ProgressBar
Indeterminate progress bar for loading states.

**Example:**
```tsx
import { ProgressBar } from '@/components/ui';

<ProgressBar label="Processing image..." />
<ProgressBar /> {/* Without label */}
```

## Accessibility

All components follow accessibility best practices:
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Error announcements

## Testing

All components have comprehensive unit tests. Run tests with:

```bash
npm test
```

## Styling

Components use TailwindCSS utility classes for styling. Custom styles can be added via the `className` prop available on all components.
