/**
 * Fuzzy Friends — the owner's 40 illustrated Fuzzies (cut out of their picture sheet into transparent WebP files in
 * `public/art/friends/`, 256 px, ~20 KB each, loaded only when shown). Used as editor stickers and profile avatars.
 */
export interface Friend { id: string; name: string; tags: string[] }

export const FRIENDS: Friend[] = [
  { id: 'f01', name: 'Pink Fuzzy', tags: ['pink', 'happy'] }, { id: 'f02', name: 'Cheeky Red', tags: ['red', 'tongue', 'silly'] },
  { id: 'f03', name: 'Giggly Orange', tags: ['orange', 'laugh'] }, { id: 'f04', name: 'Sunny Yellow', tags: ['yellow', 'smile'] },
  { id: 'f05', name: 'Surprised Green', tags: ['green', 'wow'] }, { id: 'f06', name: 'Sweet Cyan', tags: ['cyan', 'blue', 'smile'] },
  { id: 'f07', name: 'Grumpy Blue', tags: ['blue', 'grumpy', 'angry'] }, { id: 'f08', name: 'Silly Purple', tags: ['purple', 'wink', 'tongue'] },
  { id: 'f09', name: 'In Love', tags: ['purple', 'love', 'hearts'] }, { id: 'f10', name: 'Big Heart', tags: ['pink', 'love', 'heart', 'valentine'] },
  { id: 'f11', name: 'Bow Wink', tags: ['pink', 'bow', 'wink', 'girl'] }, { id: 'f12', name: 'Teary', tags: ['orange', 'sad', 'cry'] },
  { id: 'f13', name: 'Cool Shades', tags: ['yellow', 'sunglasses', 'cool', 'summer'] }, { id: 'f14', name: 'Happy Green', tags: ['green', 'laugh'] },
  { id: 'f15', name: 'Sleepy', tags: ['blue', 'sleep', 'night', 'zzz'] }, { id: 'f16', name: 'Curious', tags: ['blue', 'question', 'think'] },
  { id: 'f17', name: 'Bunny', tags: ['pink', 'rabbit', 'easter', 'carrot', 'spring'] }, { id: 'f18', name: 'DJ', tags: ['red', 'headphones', 'music', 'hoodie'] },
  { id: 'f19', name: 'Pumpkin', tags: ['orange', 'halloween', 'jack-o-lantern'] }, { id: 'f20', name: 'Bee', tags: ['yellow', 'bee', 'spring', 'garden'] },
  { id: 'f21', name: 'Dino', tags: ['green', 'dinosaur', 'costume', 'party'] }, { id: 'f22', name: 'Pilot', tags: ['cyan', 'aviator', 'travel', 'goggles'] },
  { id: 'f23', name: 'Officer', tags: ['blue', 'police', 'uniform'] }, { id: 'f24', name: 'Wizard', tags: ['purple', 'magic', 'wand', 'stars'] },
  { id: 'f25', name: 'Santa', tags: ['pink', 'christmas', 'santa', 'winter'] }, { id: 'f26', name: 'Reindeer', tags: ['brown', 'christmas', 'rudolph', 'winter'] },
  { id: 'f27', name: 'Snowman', tags: ['white', 'snow', 'winter', 'christmas'] }, { id: 'f28', name: 'Princess', tags: ['pink', 'crown', 'tutu', 'birthday'] },
  { id: 'f29', name: 'Unicorn', tags: ['purple', 'unicorn', 'rainbow', 'magic'] }, { id: 'f30', name: 'Rainbow', tags: ['rainbow', 'pride', 'sunglasses', 'party'] },
  { id: 'f31', name: 'Skeleton', tags: ['black', 'halloween', 'skeleton', 'spooky'] }, { id: 'f32', name: 'Cowboy', tags: ['orange', 'cowboy', 'hat', 'western'] },
  { id: 'f33', name: 'Boba', tags: ['cyan', 'bubble tea', 'drink', 'cafe'] }, { id: 'f34', name: 'Gamer', tags: ['blue', 'controller', 'game', 'play'] },
  { id: 'f35', name: 'Bookworm', tags: ['purple', 'book', 'glasses', 'school', 'read'] }, { id: 'f36', name: 'Fashion', tags: ['pink', 'heart glasses', 'handbag', 'shopping'] },
  { id: 'f37', name: 'Chef', tags: ['red', 'chef', 'cooking', 'kitchen', 'baker'] }, { id: 'f38', name: 'Doctor', tags: ['yellow', 'doctor', 'stethoscope', 'health'] },
  { id: 'f39', name: 'Graduate', tags: ['green', 'graduation', 'school', 'diploma'] }, { id: 'f40', name: 'Hockey', tags: ['blue', 'hockey', 'sport', 'helmet'] },
];
export const friendUrl = (id: string): string => `${import.meta.env.BASE_URL}art/friends/${id}.webp`;
export const friend = (id: string): Friend | undefined => FRIENDS.find((f) => f.id === id);

const cache = new Map<string, Promise<string>>();
/** The picture as a data URL (kept inside designs so they export and sync without the server). */
export function friendData(id: string): Promise<string> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(friendUrl(id)).then((r) => r.blob()).then((b) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(b); }));
    cache.set(id, p);
  }
  return p;
}
