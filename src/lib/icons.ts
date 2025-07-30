import {
  // 食料・飲み物
  Apple, Coffee, Sandwich, Milk, Cookie,
  // 医療・薬品
  Heart, Pill, Bandage, Thermometer, Stethoscope,
  // 衣類・身の回り品
  Shirt, Glasses, Watch, Backpack, Umbrella,
  // 電子機器
  Smartphone, Radio, Flashlight, Battery, Camera,
  // 文具・書類
  BookOpen, PenTool, FileText, CreditCard, Key,
  // 清潔用品
  Droplets, Zap, Scissors, Circle, Brush,
  // 工具・ツール
  Wrench, Hammer, Utensils, Cable, ShieldCheck,
  // その他
  Home, Car, Map, Compass, Star,
  // デフォルト
  Package
} from 'lucide-react';

// アイコンマッピング
export const iconMap = {
  // 食料・飲み物
  apple: Apple,
  coffee: Coffee,
  sandwich: Sandwich,
  milk: Milk,
  cookie: Cookie,
  
  // 医療・薬品
  heart: Heart,
  pill: Pill,
  bandage: Bandage,
  thermometer: Thermometer,
  stethoscope: Stethoscope,
  
  // 衣類・身の回り品
  shirt: Shirt,
  glasses: Glasses,
  watch: Watch,
  backpack: Backpack,
  umbrella: Umbrella,
  
  // 電子機器
  smartphone: Smartphone,
  radio: Radio,
  flashlight: Flashlight,
  battery: Battery,
  camera: Camera,
  
  // 文具・書類
  book: BookOpen,
  pen: PenTool,
  document: FileText,
  card: CreditCard,
  key: Key,
  
  // 清潔用品
  water: Droplets,
  soap: Zap,         // 石鹸の代替
  scissors: Scissors,
  mirror: Circle,    // 鏡の代替
  brush: Brush,
  
  // 工具・ツール
  wrench: Wrench,
  hammer: Hammer,
  knife: Utensils,   // ナイフの代替
  rope: Cable,       // ロープの代替
  shield: ShieldCheck,
  
  // その他
  home: Home,
  car: Car,
  map: Map,
  compass: Compass,
  star: Star,
  
  // デフォルト
  package: Package
};

// アイコンカテゴリ
export const iconCategories = {
  food: { label: '食料・飲み物', icons: ['apple', 'coffee', 'sandwich', 'milk', 'cookie'] },
  medical: { label: '医療・薬品', icons: ['heart', 'pill', 'bandage', 'thermometer', 'stethoscope'] },
  clothing: { label: '衣類・身の回り品', icons: ['shirt', 'glasses', 'watch', 'backpack', 'umbrella'] },
  electronics: { label: '電子機器', icons: ['smartphone', 'radio', 'flashlight', 'battery', 'camera'] },
  stationery: { label: '文具・書類', icons: ['book', 'pen', 'document', 'card', 'key'] },
  hygiene: { label: '清潔用品', icons: ['water', 'soap', 'scissors', 'mirror', 'brush'] },
  tools: { label: '工具・ツール', icons: ['wrench', 'hammer', 'knife', 'rope', 'shield'] },
  other: { label: 'その他', icons: ['home', 'car', 'map', 'compass', 'star'] }
};

// アイテム名から推奨アイコンを取得
export const suggestIcon = (itemName: string): string => {
  const name = itemName.toLowerCase();
  
  if (name.includes('水') || name.includes('飲み物')) return 'water';
  if (name.includes('食') || name.includes('パン') || name.includes('米')) return 'apple';
  if (name.includes('薬') || name.includes('医療')) return 'pill';
  if (name.includes('服') || name.includes('着替え')) return 'shirt';
  if (name.includes('ライト') || name.includes('懐中電灯')) return 'flashlight';
  if (name.includes('電池') || name.includes('バッテリー')) return 'battery';
  if (name.includes('ラジオ')) return 'radio';
  if (name.includes('携帯') || name.includes('スマホ')) return 'smartphone';
  if (name.includes('タオル') || name.includes('石鹸')) return 'soap';
  if (name.includes('カード') || name.includes('身分証')) return 'card';
  if (name.includes('鍵') || name.includes('キー')) return 'key';
  if (name.includes('眼鏡') || name.includes('メガネ')) return 'glasses';
  if (name.includes('時計')) return 'watch';
  if (name.includes('カバン') || name.includes('バッグ')) return 'backpack';
  if (name.includes('傘')) return 'umbrella';
  if (name.includes('地図')) return 'map';
  
  return 'package'; // デフォルト
};

// アイコンコンポーネントを取得
export const getIconComponent = (iconName?: string) => {
  if (!iconName) return iconMap.package;
  return iconMap[iconName as keyof typeof iconMap] || iconMap.package;
};
