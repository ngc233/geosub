import type { ProductEditorialContent } from './product-editorial-content';

const sourceUrl = 'https://www.spotify.com/premium/';
export const spotifyEditorial: Record<'zh' | 'en', ProductEditorialContent> = {
  zh: {
    summary: 'Spotify Premium 提供个人与家庭音乐订阅。本页比较已核验地区官网的月付正价，试用优惠与后续月费分开处理；当前地区覆盖、套餐名称和价格均以已发布数据为准。',
    sectionTitle: '这个套餐适合谁', bestForLabel: '适合', differenceLabel: '套餐区别',
    availabilityLabel: '订阅前注意', sourceLabel: '查看 Spotify 官方套餐',
    plans: {
      individual: { bestFor: '主要由自己使用一个独立 Premium 账号听音乐，并希望按个人需求选择订阅的用户。',
        difference: 'Individual 对应一个 Premium 账号；Family 则供符合条件的同住家庭成员分别使用各自账号。',
        availabilityNote: '本页显示各地区官网的后续月付正价，试用资格、税费与最终金额以 Spotify 结账页为准。', sourceUrl },
      family: { bestFor: '成员居住在同一地址、最多六人分别需要自己的 Premium 账号，并符合 Spotify 家庭资格规则的家庭。',
        difference: 'Family 最多支持六个 Premium 账号；成员需居住在同一地址，不能把套餐月费误解为每位成员的费用。',
        availabilityNote: '这是各地区官网的整组家庭月费；同住和账号资格以 Spotify 官方规则及结账核验为准。', sourceUrl },
    },
  },
  en: {
    summary: 'Spotify Premium offers individual and household music subscriptions. This page compares regular monthly prices from verified regional websites separately from introductory offers. Plan names, current prices and market coverage come from the published dataset.',
    sectionTitle: 'Who this plan is for', bestForLabel: 'Best for', differenceLabel: 'Plan differences',
    availabilityLabel: 'Before subscribing', sourceLabel: 'View official Spotify plans',
    plans: {
      individual: { bestFor: 'One person using a single Premium account for music.',
        difference: 'Individual includes one Premium account. Family supports separate accounts for eligible household members.',
        availabilityNote: 'The listed regional Web price is the regular monthly amount after an introductory offer. Trial eligibility, taxes and final charges are determined at Spotify checkout.', sourceUrl },
      family: { bestFor: 'A household with up to six members who need their own Premium accounts.',
        difference: 'Family covers up to six Premium accounts for members residing at the same address. The displayed price is the whole monthly plan, not a per-member fee.',
        availabilityNote: 'This is the regional Web household plan. Household and account eligibility are determined by Spotify rules and checkout.', sourceUrl },
    },
  },
};
