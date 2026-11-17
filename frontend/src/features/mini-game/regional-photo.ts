import { regionalPhotos } from './content/regional-media.js';
import { regionalStories } from './content/regions.js';

/** Afternoon references reuse the morning actually selected, not an unplayed branch. */
export function resolveRegionalPhoto(assetId: string, selectedMorningChoiceId?: string) {
  const separator = assetId.indexOf(':');
  if (separator < 0) return null;
  const slug = assetId.slice(0, separator);
  const suffix = assetId.slice(separator + 1);
  const story = regionalStories.find(candidate => candidate.slug === slug);
  if (!story) return null;
  const valid = ['intro','meal','pause','postcard','postcard-scene','postcard-colour', ...story.morning.map(choice => choice.id), ...story.lunch.map(choice => choice.id)];
  if (!valid.includes(suffix)) return null;
  const selectedMorning = story.morning.find(choice => choice.id === selectedMorningChoiceId) ?? story.morning[0];
  const direct = [...story.morning, ...story.lunch].find(choice => choice.id === suffix);
  const choiceId = direct?.id ?? (suffix === 'meal' ? story.lunch[0].id : selectedMorning.id);
  const photo = regionalPhotos.find(candidate => candidate.choiceId === choiceId);
  if (!photo) return null;
  const role = suffix === 'postcard-colour' ? 'postcard-colour'
    : suffix === 'postcard' || suffix === 'postcard-scene' ? 'postcard-scene'
    : suffix === 'pause' ? 'pause' : suffix === 'meal' ? 'meal-preview' : 'scene';
  return { photo, role, province: story.name, accent: story.accent };
}
