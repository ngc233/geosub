import type { ProductEditorialContent } from './product-editorial-content';

const sourceUrl = 'https://www.spotify.com/premium/';
export const spotifyEditorial: Record<'zh' | 'en', ProductEditorialContent> = {
  zh: {
    summary: 'Spotify Premium 在不同地区提供 Individual、Family、Standard 和 Platinum 等音乐订阅。本页按套餐分别比较已核验地区官网的月付正价，试用优惠与后续月费分开处理；当前地区覆盖、套餐名称和价格均以已发布数据为准。',
    sectionTitle: '这个套餐适合谁', bestForLabel: '适合', differenceLabel: '套餐区别',
    availabilityLabel: '订阅前注意', sourceLabel: '查看 Spotify 官方套餐',
    plans: {
      standard: { bestFor: '在提供 Standard 的地区，由一人使用独立账号，主要需要无广告音乐、离线收听和最高约 320 kbps 音质的用户。',
        difference: 'Standard 包含一个 Standard 账号。它在部分地区作为独立套餐销售，应在 Standard 套餐内比较各地价格。',
        availabilityNote: '本页显示地区官网的后续月付正价；美国暂无同名套餐价格，因此不提供美国差价。优惠资格、税费与可选付费方式以官方结账页为准。', sourceUrl:'https://www.spotify.com/in-en/premium/' },
      platinum: { bestFor: '在提供 Platinum 的地区，最多三名同住成员分别使用独立账号，并需要无损音质等 Platinum 功能的用户。',
        difference: 'Platinum 最多支持三个同住成员账号，官网标价为整组套餐月费；音质最高约为 24-bit/44.1 kHz，具体功能与地区支持以官方说明为准。',
        availabilityNote: 'Platinum 单独比较地区价格。美国暂无同名套餐价格，因此不提供美国差价；同住资格、税费和具体功能以 Spotify 官方页面及结账核验为准。', sourceUrl:'https://www.spotify.com/in-en/premium/' },
      individual: { bestFor: '主要由自己使用一个独立 Premium 账号听音乐，并希望按个人需求选择订阅的用户。',
        difference: 'Individual 对应一个 Premium 账号；Family 则供符合条件的同住家庭成员分别使用各自账号。',
        availabilityNote: '本页显示各地区官网的后续月付正价，试用资格、税费与最终金额以 Spotify 结账页为准。', sourceUrl },
      family: { bestFor: '成员居住在同一地址、最多六人分别需要自己的 Premium 账号，并符合 Spotify 家庭资格规则的家庭。',
        difference: 'Family 最多支持六个 Premium 账号；成员需居住在同一地址，不能把套餐月费误解为每位成员的费用。',
        availabilityNote: '这是各地区官网的整组家庭月费；同住和账号资格以 Spotify 官方规则及结账核验为准。', sourceUrl },
    },
  },
  en: {
    summary: 'Spotify Premium offers Individual, Family, Standard and Platinum music subscriptions in different markets. This page compares each plan separately using regular monthly prices from verified regional websites, excluding introductory offers. Current prices and market coverage come from the published dataset.',
    sectionTitle: 'Who this plan is for', bestForLabel: 'Best for', differenceLabel: 'Plan differences',
    availabilityLabel: 'Before subscribing', sourceLabel: 'View official Spotify plans',
    plans: {
      standard: { bestFor: 'One person in a Standard market who wants ad-free music, offline listening and very high audio quality up to about 320 kbps.',
        difference: 'Standard includes one Standard account and is a separately sold regional plan. Compare its prices within the Standard tier.',
        availabilityNote: 'The listed Web amount is the regular monthly price after introductory offers. No same-plan US price is available, so the US comparison is unavailable. Eligibility, taxes and payment options are determined at Spotify checkout.', sourceUrl:'https://www.spotify.com/in-en/premium/' },
      platinum: { bestFor: 'Up to three people living at the same address who want separate accounts and Platinum features such as lossless audio.',
        difference: 'Platinum covers up to three accounts in one household. The listed monthly price covers the whole plan. Audio quality is up to about 24-bit/44.1 kHz; features and regional support follow Spotify’s official description.',
        availabilityNote: 'Platinum prices are compared as a separate tier. No same-plan US price is available, so the US comparison is unavailable. Household eligibility, taxes and features are determined by Spotify.', sourceUrl:'https://www.spotify.com/in-en/premium/' },
      individual: { bestFor: 'One person using a single Premium account for music.',
        difference: 'Individual includes one Premium account. Family supports separate accounts for eligible household members.',
        availabilityNote: 'The listed regional Web price is the regular monthly amount after an introductory offer. Trial eligibility, taxes and final charges are determined at Spotify checkout.', sourceUrl },
      family: { bestFor: 'A household with up to six members who need their own Premium accounts.',
        difference: 'Family covers up to six Premium accounts for members residing at the same address. The displayed price is the whole monthly plan, not a per-member fee.',
        availabilityNote: 'This is the regional Web household plan. Household and account eligibility are determined by Spotify rules and checkout.', sourceUrl },
    },
  },
};
