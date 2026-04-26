import { AdRecord } from '@/types';

interface ChannelProfile {
  name: string;
  campaigns: string[];
  baseSpend: [number, number];
  cpmRange: [number, number];
  ctrRange: [number, number];
  cvrRange: [number, number];
  revenuePerConversion: [number, number];
  retentionRate: [number, number];
}

const CHANNEL_PROFILES: ChannelProfile[] = [
  {
    name: '抖音',
    campaigns: ['春季促销_抖音_A', '春季促销_抖音_B', '品牌种草_抖音_C'],
    baseSpend: [3500, 8500],
    cpmRange: [28, 42],
    ctrRange: [2.5, 3.5],
    cvrRange: [3.2, 4.5],
    revenuePerConversion: [130, 170],
    retentionRate: [0.48, 0.60],
  },
  {
    name: '快手',
    campaigns: ['品牌曝光_快手_A', '品牌曝光_快手_B'],
    baseSpend: [2000, 4500],
    cpmRange: [18, 28],
    ctrRange: [2.6, 3.6],
    cvrRange: [3.5, 4.8],
    revenuePerConversion: [120, 155],
    retentionRate: [0.46, 0.58],
  },
  {
    name: '微信朋友圈',
    campaigns: ['精准获客_微信_A', '精准获客_微信_B'],
    baseSpend: [2800, 5800],
    cpmRange: [48, 68],
    ctrRange: [2.5, 3.3],
    cvrRange: [3.8, 5.5],
    revenuePerConversion: [145, 185],
    retentionRate: [0.58, 0.72],
  },
  {
    name: '今日头条',
    campaigns: ['信息流_头条_A', '信息流_头条_B'],
    baseSpend: [1800, 4200],
    cpmRange: [22, 36],
    ctrRange: [2.6, 3.4],
    cvrRange: [2.6, 3.6],
    revenuePerConversion: [110, 145],
    retentionRate: [0.42, 0.55],
  },
  {
    name: 'xiaohongshu',
    campaigns: ['种草笔记_小红书_A', '搜索推广_小红书_B'],
    baseSpend: [2200, 5000],
    cpmRange: [35, 55],
    ctrRange: [2.2, 3.2],
    cvrRange: [3.0, 4.6],
    revenuePerConversion: [125, 165],
    retentionRate: [0.50, 0.65],
  },
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.round(rand(min, max));
}

function generateDate(startDate: Date, dayOffset: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

export function generateMockData(days: number = 14): AdRecord[] {
  const records: AdRecord[] = [];

  const startYear = 2024;
  const startMonth = randInt(1, 6);
  const startDay = randInt(1, 15);
  const startDate = new Date(startYear, startMonth - 1, startDay);

  const weekendFactor = () => 1 + rand(0.1, 0.35);
  const dailyNoise = () => rand(0.82, 1.18);
  const trendFactor = (day: number) => 1 + (day / days) * rand(-0.08, 0.15);

  for (let day = 0; day < days; day++) {
    const date = generateDate(startDate, day);
    const dayOfWeek = new Date(startDate.getTime() + day * 86400000).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const ch of CHANNEL_PROFILES) {
      const activeCampaigns = day < 3
        ? ch.campaigns.slice(0, 1)
        : day < 7
          ? ch.campaigns.slice(0, Math.min(2, ch.campaigns.length))
          : ch.campaigns.slice(0, randInt(1, ch.campaigns.length));

      for (const campaign of activeCampaigns) {
        const noise = dailyNoise();
        const trend = trendFactor(day);
        const wknd = isWeekend ? weekendFactor() : 1;

        const spend = Math.round(rand(ch.baseSpend[0], ch.baseSpend[1]) * noise * trend * wknd / activeCampaigns.length);
        const cpm = rand(ch.cpmRange[0], ch.cpmRange[1]) * noise;
        const impressions = Math.round((spend / cpm) * 1000);
        const ctr = rand(ch.ctrRange[0], ch.ctrRange[1]) * noise / 100;
        const clicks = Math.round(impressions * ctr);
        const cvr = rand(ch.cvrRange[0], ch.cvrRange[1]) * noise / 100;
        const conversions = Math.max(1, Math.round(clicks * cvr));
        const rpc = rand(ch.revenuePerConversion[0], ch.revenuePerConversion[1]);
        const revenue = Math.round(conversions * rpc * noise);
        const newUsers = Math.round(conversions * rand(0.78, 0.92));
        const retRate = rand(ch.retentionRate[0], ch.retentionRate[1]);
        const retainedD7 = Math.round(newUsers * retRate);

        records.push({
          date,
          channel: ch.name,
          campaign_name: campaign,
          spend,
          impressions,
          clicks,
          conversions,
          revenue,
          new_users: newUsers,
          retained_d7: retainedD7,
        });
      }
    }
  }

  return records;
}
