import type { ChallengeReward, Content } from '../core/content';
import { rewardOf } from '../core/run';
import { counted, formatNumber, listed } from './format';

/** What a challenge pays, in words: "100 coins, 5 Cooked shrimp and 2 bounty points." */
export function rewardWords(reward: ChallengeReward, content: Content): string {
  const paid = rewardOf(reward, content);
  const parts = [
    ...(paid.coins > 0 ? [`${formatNumber(paid.coins)} coins`] : []),
    ...paid.items.map(({ item, qty }) => `${formatNumber(qty)} ${content.items[item]!.name}`),
    ...(paid.bountyPoints > 0 ? [counted(paid.bountyPoints, 'bounty point')] : []),
  ];
  return parts.length > 0 ? `${listed(parts)}.` : '';
}
