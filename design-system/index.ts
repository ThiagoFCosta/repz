// API pública do design system Prisma. Importe sempre daqui (`@ds`), nunca de components/** —
// a regra de lint de aderência (design-system/lint) acusa imports internos.

// core
export { Avatar, type AvatarProps } from './components/core/Avatar';
export { Badge, type BadgeProps, type BadgeTone } from './components/core/Badge';
export { Button, type ButtonProps, type ButtonVariant } from './components/core/Button';
export { Chip, type ChipProps } from './components/core/Chip';
export { Icon, ICON_NAMES, type IconProps, type IconName } from './components/core/Icon';
export { IconButton, type IconButtonProps } from './components/core/IconButton';
export { Kbd, type KbdProps } from './components/core/Kbd';
export { Logo, type LogoProps } from './components/core/Logo';
export { ICON_PATHS } from './components/core/iconPaths';
export { cx } from './components/core/cx';

// forms
export { Checkbox, type CheckboxProps } from './components/forms/Checkbox';
export { Input, type InputProps } from './components/forms/Input';
export { MonthPicker, type MonthPickerProps, type MonthPickerMode } from './components/forms/MonthPicker';
export { Radio, type RadioProps } from './components/forms/Radio';
export { Select, type SelectProps, type SelectOption } from './components/forms/Select';
export { Switch, type SwitchProps } from './components/forms/Switch';

// navigation
export { AppShell, type AppShellProps } from './components/navigation/AppShell';
export { BottomNav, type BottomNavProps, type BottomNavItem } from './components/navigation/BottomNav';
export { Breadcrumb, type BreadcrumbProps, type BreadcrumbItem } from './components/navigation/Breadcrumb';
export { Sidebar, NavItem, type SidebarProps, type NavItemProps, type NavEntry, type NavSection } from './components/navigation/Sidebar';
export { Tabs, type TabsProps, type TabItem } from './components/navigation/Tabs';
export { TopBar, type TopBarProps } from './components/navigation/TopBar';

// data
export { AreaChart, type AreaChartProps, type AreaSeries } from './components/data/AreaChart';
export { BarChart, type BarChartProps, type BarDatum } from './components/data/BarChart';
export { Card, type CardProps } from './components/data/Card';
export { DataTable, type DataTableProps, type DataColumn, type SortState } from './components/data/DataTable';
export { Delta, type DeltaProps } from './components/data/Delta';
export { DonutChart, type DonutChartProps, type DonutSegment } from './components/data/DonutChart';
export { Gauge, gaugeBandIndex, GAUGE_BANDS_INVESTIDOMETRO, type GaugeProps, type GaugeBand } from './components/data/Gauge';
export { Legend, type LegendProps, type LegendItem } from './components/data/Legend';
export { ProgressBar, type ProgressBarProps } from './components/data/ProgressBar';
export { StatTile, type StatTileProps } from './components/data/StatTile';

// feedback
export { Dialog, type DialogProps } from './components/feedback/Dialog';
export { Toast, type ToastProps, type ToastTone } from './components/feedback/Toast';
export { Tooltip, type TooltipProps } from './components/feedback/Tooltip';

// finance
export { BalanceCard, type BalanceCardProps, type BalanceAction } from './components/finance/BalanceCard';
export { CreditCard, type CreditCardProps, type CardTone } from './components/finance/CreditCard';
export { CurrencySelect, CURRENCY_FLAGS, type CurrencySelectProps, type CurrencyCode } from './components/finance/CurrencySelect';
export { PaymentCardItem, type PaymentCardItemProps } from './components/finance/PaymentCardItem';

// ai
export { AIComposer, type AIComposerProps, type ComposerTool } from './components/ai/AIComposer';
export { AIOrb, type AIOrbProps } from './components/ai/AIOrb';
export { ChatMessage, type ChatMessageProps } from './components/ai/ChatMessage';
export { PromptCard, type PromptCardProps } from './components/ai/PromptCard';
