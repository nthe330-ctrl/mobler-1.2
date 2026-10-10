import React from 'react';
import {
  Cat,
  Dog,
  Dices,
  Wrench,
  Gamepad2,
  BookOpen,
  Sprout,
  Palette,
  Disc3,
  Shirt,
  ToyBrick,
  Zap,
  Glasses,
  Sparkles,
  Car,
  Bike,
  Armchair,
  Rocket,
  CassetteTape,
  Radio,
  Heart,
  CircleDot,
  Building,
  Leaf,
  Wifi,
  Bath,
  CircleParking,
  Wind,
  Trees,
  Lock,
  Users,
  ConciergeBell,
  Coffee,
  LucideProps
} from 'lucide-react';
import { SpecialModel, ShopStyle, Amenity } from '@shared/types';

interface IconProps extends LucideProps {
  model?: SpecialModel | string;
  styleName?: ShopStyle | string;
  amenity?: Amenity | string;
}

export const ModelIcon: React.FC<{ model?: SpecialModel | string; size?: number; className?: string }> = ({
  model,
  size = 16,
  className = '',
}) => {
  switch (model) {
    case 'Cat Café':
      return <Cat size={size} className={`shrink-0 ${className}`} />;
    case 'Dog Café':
      return <Dog size={size} className={`shrink-0 ${className}`} />;
    case 'Board Game Café':
      return <Dices size={size} className={`shrink-0 ${className}`} />;
    case 'Workshop Café':
      return <Wrench size={size} className={`shrink-0 ${className}`} />;
    case 'Console Gaming Café':
      return <Gamepad2 size={size} className={`shrink-0 ${className}`} />;
    case 'Book Café':
      return <BookOpen size={size} className={`shrink-0 ${className}`} />;
    case 'Plant Café':
      return <Sprout size={size} className={`shrink-0 ${className}`} />;
    case 'Ceramic Café':
      return <Palette size={size} className={`shrink-0 ${className}`} />;
    case 'Vinyl Café':
      return <Disc3 size={size} className={`shrink-0 ${className}`} />;
    case 'Fashion Café':
      return <Shirt size={size} className={`shrink-0 ${className}`} />;
    case 'Art Toy Café':
      return <ToyBrick size={size} className={`shrink-0 ${className}`} />;
    case 'Anime Café':
      return <Zap size={size} className={`shrink-0 ${className}`} />;
    case 'VR Café':
      return <Glasses size={size} className={`shrink-0 ${className}`} />;
    case 'Immersive Café':
      return <Sparkles size={size} className={`shrink-0 ${className}`} />;
    case 'Car Workshop Café':
      return <Car size={size} className={`shrink-0 ${className}`} />;
    case 'Moto Workshop Café':
      return <Bike size={size} className={`shrink-0 ${className}`} />;
    default:
      return <Sparkles size={size} className={`shrink-0 ${className}`} />;
  }
};

export const StyleIcon: React.FC<{ styleName?: ShopStyle | string; size?: number; className?: string }> = ({
  styleName,
  size = 16,
  className = '',
}) => {
  switch (styleName) {
    case 'Cozy Modern':
      return <Armchair size={size} className={`shrink-0 ${className}`} />;
    case 'Futuristic':
      return <Rocket size={size} className={`shrink-0 ${className}`} />;
    case 'Retro':
      return <CassetteTape size={size} className={`shrink-0 ${className}`} />;
    case 'Vintage':
      return <Radio size={size} className={`shrink-0 ${className}`} />;
    case 'Cute':
      return <Heart size={size} className={`shrink-0 ${className}`} />;
    case 'Minimalist':
      return <CircleDot size={size} className={`shrink-0 ${className}`} />;
    case 'Industrial':
      return <Building size={size} className={`shrink-0 ${className}`} />;
    case 'Nature':
      return <Leaf size={size} className={`shrink-0 ${className}`} />;
    case 'Artistic':
      return <Palette size={size} className={`shrink-0 ${className}`} />;
    default:
      return <Palette size={size} className={`shrink-0 ${className}`} />;
  }
};

export const AmenityIcon: React.FC<{ amenity?: Amenity | string; size?: number; className?: string }> = ({
  amenity,
  size = 16,
  className = '',
}) => {
  switch (amenity) {
    case 'Wi-Fi':
      return <Wifi size={size} className={`shrink-0 ${className}`} />;
    case 'Chỗ sạc':
      return <Zap size={size} className={`shrink-0 ${className}`} />;
    case 'WC':
      return <Bath size={size} className={`shrink-0 ${className}`} />;
    case 'Parking':
      return <CircleParking size={size} className={`shrink-0 ${className}`} />;
    case 'Indoor':
      return <Wind size={size} className={`shrink-0 ${className}`} />;
    case 'Outdoor':
      return <Trees size={size} className={`shrink-0 ${className}`} />;
    case 'Private':
      return <Lock size={size} className={`shrink-0 ${className}`} />;
    case 'Shared':
      return <Users size={size} className={`shrink-0 ${className}`} />;
    case 'Table Service':
      return <ConciergeBell size={size} className={`shrink-0 ${className}`} />;
    case 'Self Service':
      return <Coffee size={size} className={`shrink-0 ${className}`} />;
    default:
      return <Coffee size={size} className={`shrink-0 ${className}`} />;
  }
};
