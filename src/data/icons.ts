import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import {
  // Food
  faAppleWhole, faCarrot, faDrumstickBite, faGlassWater, faBreadSlice,
  faBowlFood, faBowlRice, faEgg, faIceCream, faCookieBite, faLemon,
  faCheese, faFish, faMugHot, faPizzaSlice, faLeaf,
  // Chores / home
  faBroom, faBed, faTooth, faTrashCan, faSink, faShirt, faShower, faSoap,
  faPaintRoller, faPlateWheat, faScrewdriverWrench, faHelmetSafety, faGears,
  faRobot,
  // Play / sport
  faSoccerBall, faDumbbell, faBicycle, faPersonRunning,
  // Learning / fun
  faBookOpen, faMusic, faPalette, faPuzzlePiece, faGamepad, faGuitar,
  // Pets / nature
  faDog, faCat, faPaw, faTree, faSun, faMoon,
  // Rewards / status
  faGift, faStar, faTrophy, faMedal, faAward, faCrown, faGem, faHeart,
  faThumbsUp, faCircleCheck, faMoneyBill, faMoneyBillWave, faSackDollar,
  faBagShopping, faCartShopping,
  // Effects / streaks / combos
  faFire, faBolt, faBomb, faBurst, faRainbow, faRocket, faMeteor,
  faSatellite, faBrain, faWandMagicSparkles, faHandPeace, faVolcano,
  faDove, faWind, faMountain, faWater, faBullseye, faSeedling, faUtensils,
  faShieldHalved, faTent, faTicket,
  // Avatar / faces / characters
  faFaceSmile, faFaceLaughBeam, faFaceGrinStars, faGhost, faHatWizard,
  faUserNinja, faUserAstronaut, faMask,
  // Mood / behavior
  faFaceAngry, faCommentSlash,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Single source of truth mapping string icon keys → FontAwesome icon definitions.
 * FontAwesome tree-shakes, so every icon used anywhere in the app must be imported
 * and registered here. Keys are stored in data files and in user state (goals,
 * rewards, badge overrides). An unknown/absent key falls back to a legacy emoji
 * string via `<AppIcon emojiFallback>` (see components/AppIcon.tsx), so data created
 * before this icon system keeps rendering.
 */
export const ICONS = {
  // Food
  appleWhole: faAppleWhole,
  carrot: faCarrot,
  drumstickBite: faDrumstickBite,
  glassWater: faGlassWater,
  breadSlice: faBreadSlice,
  bowlFood: faBowlFood,
  bowlRice: faBowlRice,
  egg: faEgg,
  iceCream: faIceCream,
  cookieBite: faCookieBite,
  lemon: faLemon,
  cheese: faCheese,
  fish: faFish,
  mugHot: faMugHot,
  pizzaSlice: faPizzaSlice,
  leaf: faLeaf,
  // Chores / home
  broom: faBroom,
  bed: faBed,
  tooth: faTooth,
  trashCan: faTrashCan,
  sink: faSink,
  shirt: faShirt,
  shower: faShower,
  soap: faSoap,
  paintRoller: faPaintRoller,
  plateWheat: faPlateWheat,
  screwdriverWrench: faScrewdriverWrench,
  helmetSafety: faHelmetSafety,
  gears: faGears,
  robot: faRobot,
  // Play / sport
  soccerBall: faSoccerBall,
  dumbbell: faDumbbell,
  bicycle: faBicycle,
  personRunning: faPersonRunning,
  // Learning / fun
  bookOpen: faBookOpen,
  music: faMusic,
  palette: faPalette,
  puzzlePiece: faPuzzlePiece,
  gamepad: faGamepad,
  guitar: faGuitar,
  // Pets / nature
  dog: faDog,
  cat: faCat,
  paw: faPaw,
  tree: faTree,
  sun: faSun,
  moon: faMoon,
  // Rewards / status
  gift: faGift,
  star: faStar,
  trophy: faTrophy,
  medal: faMedal,
  award: faAward,
  crown: faCrown,
  gem: faGem,
  heart: faHeart,
  thumbsUp: faThumbsUp,
  circleCheck: faCircleCheck,
  moneyBill: faMoneyBill,
  moneyBillWave: faMoneyBillWave,
  sackDollar: faSackDollar,
  bagShopping: faBagShopping,
  cartShopping: faCartShopping,
  // Effects / streaks / combos
  fire: faFire,
  bolt: faBolt,
  bomb: faBomb,
  burst: faBurst,
  rainbow: faRainbow,
  rocket: faRocket,
  meteor: faMeteor,
  satellite: faSatellite,
  brain: faBrain,
  wandMagicSparkles: faWandMagicSparkles,
  handPeace: faHandPeace,
  volcano: faVolcano,
  dove: faDove,
  wind: faWind,
  mountain: faMountain,
  water: faWater,
  bullseye: faBullseye,
  seedling: faSeedling,
  utensils: faUtensils,
  shieldHalved: faShieldHalved,
  tent: faTent,
  ticket: faTicket,
  // Avatar / faces / characters
  faceSmile: faFaceSmile,
  faceLaughBeam: faFaceLaughBeam,
  faceGrinStars: faFaceGrinStars,
  ghost: faGhost,
  hatWizard: faHatWizard,
  userNinja: faUserNinja,
  userAstronaut: faUserAstronaut,
  mask: faMask,
  // Mood / behavior
  faceAngry: faFaceAngry,
  commentSlash: faCommentSlash,
} satisfies Record<string, IconDefinition>;

export type IconKey = keyof typeof ICONS;

/** Returns the FA definition for a key, or undefined if the key is unknown/missing. */
export function resolveIcon(key?: string): IconDefinition | undefined {
  if (!key) return undefined;
  return (ICONS as Record<string, IconDefinition>)[key];
}

/**
 * For toast/celebration call sites that accept `IconDefinition | string`:
 * prefer the registered icon, else fall back to the legacy emoji string.
 */
export function resolveToastIcon(key: string | undefined, emoji: string): IconDefinition | string {
  return resolveIcon(key) ?? emoji;
}

export interface PickerIcon {
  key: IconKey;
  label: string;
}

/** Curated, kid-friendly grid shown to parents when choosing a goal/reward/badge icon. */
export const PICKER_ICONS: PickerIcon[] = [
  // Chores / home
  { key: 'broom', label: 'Broom' },
  { key: 'bed', label: 'Bed' },
  { key: 'tooth', label: 'Teeth' },
  { key: 'trashCan', label: 'Trash' },
  { key: 'sink', label: 'Dishes' },
  { key: 'shirt', label: 'Laundry' },
  { key: 'shower', label: 'Shower' },
  { key: 'soap', label: 'Wash up' },
  { key: 'paintRoller', label: 'Tidy' },
  { key: 'plateWheat', label: 'Set table' },
  // Food
  { key: 'appleWhole', label: 'Fruit' },
  { key: 'carrot', label: 'Veggie' },
  { key: 'drumstickBite', label: 'Protein' },
  { key: 'glassWater', label: 'Drink' },
  { key: 'breadSlice', label: 'Grain' },
  { key: 'bowlFood', label: 'Meal' },
  { key: 'egg', label: 'Breakfast' },
  { key: 'iceCream', label: 'Treat' },
  { key: 'cookieBite', label: 'Snack' },
  { key: 'lemon', label: 'Citrus' },
  // Play / learn
  { key: 'soccerBall', label: 'Sport' },
  { key: 'dumbbell', label: 'Exercise' },
  { key: 'bicycle', label: 'Bike' },
  { key: 'personRunning', label: 'Run' },
  { key: 'bookOpen', label: 'Reading' },
  { key: 'music', label: 'Music' },
  { key: 'palette', label: 'Art' },
  { key: 'puzzlePiece', label: 'Puzzle' },
  { key: 'gamepad', label: 'Games' },
  { key: 'guitar', label: 'Practice' },
  // Pets / nature
  { key: 'dog', label: 'Dog' },
  { key: 'cat', label: 'Cat' },
  { key: 'paw', label: 'Pet' },
  { key: 'tree', label: 'Outdoors' },
  { key: 'sun', label: 'Sun' },
  { key: 'leaf', label: 'Plant' },
  // Rewards / status
  { key: 'gift', label: 'Gift' },
  { key: 'star', label: 'Star' },
  { key: 'trophy', label: 'Trophy' },
  { key: 'medal', label: 'Medal' },
  { key: 'crown', label: 'Crown' },
  { key: 'heart', label: 'Heart' },
  { key: 'moneyBill', label: 'Money' },
  { key: 'thumbsUp', label: 'Thumbs up' },
  { key: 'circleCheck', label: 'Done' },
  // Mood / behavior
  { key: 'handPeace', label: 'Peace' },
  { key: 'faceAngry', label: 'Angry' },
  { key: 'commentSlash', label: 'Quiet' },
];

/** Curated, fun/personality-themed grid shown when customizing the avatar icon. */
export const AVATAR_ICONS: PickerIcon[] = [
  // Faces / characters
  { key: 'faceSmile', label: 'Smile' },
  { key: 'faceLaughBeam', label: 'Laugh' },
  { key: 'faceGrinStars', label: 'Star-struck' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'hatWizard', label: 'Wizard' },
  { key: 'userNinja', label: 'Ninja' },
  { key: 'userAstronaut', label: 'Astronaut' },
  { key: 'mask', label: 'Hero' },
  // Animals
  { key: 'robot', label: 'Robot' },
  { key: 'dog', label: 'Dog' },
  { key: 'cat', label: 'Cat' },
  { key: 'paw', label: 'Paw' },
  { key: 'dove', label: 'Dove' },
  // Status / personality
  { key: 'crown', label: 'Crown' },
  { key: 'star', label: 'Star' },
  { key: 'trophy', label: 'Trophy' },
  { key: 'medal', label: 'Medal' },
  { key: 'gem', label: 'Gem' },
  { key: 'heart', label: 'Heart' },
  // Effects / nature
  { key: 'rocket', label: 'Rocket' },
  { key: 'fire', label: 'Fire' },
  { key: 'rainbow', label: 'Rainbow' },
  { key: 'wandMagicSparkles', label: 'Magic' },
  { key: 'sun', label: 'Sun' },
  { key: 'moon', label: 'Moon' },
];
