import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { JobListing } from '../models/JobListing';
import { WorkerProfile } from '../models/WorkerProfile';

dotenv.config();

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Indore', 'Nagpur', 'Kochi',
  'Coimbatore', 'Bhopal', 'Patna', 'Thiruvananthapuram', 'Visakhapatnam', 'Vadodara',
  'Surat', 'Ranchi',
];

const SECTORS = ['IT', 'BPO', 'Finance', 'Healthcare', 'Manufacturing', 'Education', 'Retail', 'Marketing'];

const ROLES: Array<{
  title: string;
  normalized: string;
  sector: string;
  skills: string[];
  salaryRange: [number, number];
  aiRisk: number;
  aiTools: string[];
}> = [
  { title: 'Software Developer', normalized: 'software developer', sector: 'IT', skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Git'], salaryRange: [600000, 1800000], aiRisk: 15, aiTools: ['GitHub Copilot'] },
  { title: 'Data Entry Operator', normalized: 'data entry operator', sector: 'BPO', skills: ['MS Office', 'Typing', 'Data Entry', 'Excel'], salaryRange: [180000, 360000], aiRisk: 78, aiTools: ['ChatGPT', 'AutoML'] },
  { title: 'BPO Executive', normalized: 'bpo executive', sector: 'BPO', skills: ['Communication', 'English', 'Customer Service', 'CRM'], salaryRange: [200000, 450000], aiRisk: 82, aiTools: ['AI Chatbot', 'Voice AI'] },
  { title: 'Telecaller', normalized: 'telecaller', sector: 'BPO', skills: ['Communication', 'Hindi', 'English', 'Sales'], salaryRange: [150000, 300000], aiRisk: 75, aiTools: ['Voice AI', 'Auto Dialer'] },
  { title: 'Data Analyst', normalized: 'data analyst', sector: 'IT', skills: ['Python', 'SQL', 'Tableau', 'Excel', 'Statistics'], salaryRange: [500000, 1200000], aiRisk: 25, aiTools: ['ChatGPT', 'AutoML'] },
  { title: 'Full Stack Developer', normalized: 'full stack developer', sector: 'IT', skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'AWS'], salaryRange: [800000, 2500000], aiRisk: 17, aiTools: ['GitHub Copilot', 'Cursor'] },
  { title: 'Machine Learning Engineer', normalized: 'machine learning engineer', sector: 'IT', skills: ['Python', 'TensorFlow', 'PyTorch', 'ML', 'Deep Learning'], salaryRange: [1200000, 3500000], aiRisk: 8, aiTools: [] },
  { title: 'DevOps Engineer', normalized: 'devops engineer', sector: 'IT', skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Terraform'], salaryRange: [900000, 2800000], aiRisk: 12, aiTools: ['GitHub Copilot'] },
  { title: 'Content Writer', normalized: 'content writer', sector: 'Marketing', skills: ['English', 'SEO', 'Writing', 'Research', 'WordPress'], salaryRange: [300000, 800000], aiRisk: 45, aiTools: ['ChatGPT', 'Jasper', 'Grammarly AI'] },
  { title: 'Graphic Designer', normalized: 'graphic designer', sector: 'Marketing', skills: ['Photoshop', 'Illustrator', 'Figma', 'UI Design'], salaryRange: [350000, 900000], aiRisk: 35, aiTools: ['Midjourney', 'DALL-E', 'Canva AI'] },
  { title: 'Accountant', normalized: 'accountant', sector: 'Finance', skills: ['Tally', 'Excel', 'GST', 'Accounting', 'Taxation'], salaryRange: [300000, 800000], aiRisk: 55, aiTools: ['AI Accounting'] },
  { title: 'HR Executive', normalized: 'hr executive', sector: 'Finance', skills: ['Recruitment', 'HR Management', 'Communication', 'Payroll'], salaryRange: [350000, 750000], aiRisk: 45, aiTools: ['AI Screening', 'ChatGPT'] },
  { title: 'Receptionist', normalized: 'receptionist', sector: 'BPO', skills: ['Communication', 'MS Office', 'Front Desk', 'Scheduling'], salaryRange: [180000, 350000], aiRisk: 65, aiTools: ['AI Receptionist'] },
  { title: 'Project Manager', normalized: 'project manager', sector: 'IT', skills: ['Agile', 'Scrum', 'JIRA', 'Leadership', 'Communication'], salaryRange: [1000000, 2500000], aiRisk: 30, aiTools: ['AI Project Tools'] },
  { title: 'Cybersecurity Analyst', normalized: 'cybersecurity analyst', sector: 'IT', skills: ['Network Security', 'Penetration Testing', 'SIEM', 'Firewall'], salaryRange: [800000, 2200000], aiRisk: 8, aiTools: [] },
  { title: 'Cloud Engineer', normalized: 'cloud engineer', sector: 'IT', skills: ['AWS', 'Azure', 'GCP', 'Docker', 'Terraform'], salaryRange: [900000, 2500000], aiRisk: 10, aiTools: ['GitHub Copilot'] },
  { title: 'Sales Executive', normalized: 'sales executive', sector: 'Retail', skills: ['Sales', 'Communication', 'Negotiation', 'CRM'], salaryRange: [250000, 700000], aiRisk: 35, aiTools: ['AI CRM', 'ChatGPT'] },
  { title: 'Teacher', normalized: 'teacher', sector: 'Education', skills: ['Teaching', 'Communication', 'Subject Knowledge', 'Patience'], salaryRange: [250000, 600000], aiRisk: 20, aiTools: ['AI Tutor'] },
  { title: 'Warehouse Worker', normalized: 'warehouse worker', sector: 'Manufacturing', skills: ['Inventory', 'Physical', 'Logistics', 'Forklift'], salaryRange: [180000, 350000], aiRisk: 65, aiTools: ['Robotics'] },
  { title: 'UI/UX Designer', normalized: 'ui/ux designer', sector: 'IT', skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'], salaryRange: [600000, 1800000], aiRisk: 20, aiTools: ['Figma AI', 'Midjourney'] },
];

const COMPANIES = [
  'TCS', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra', 'Cognizant',
  'Accenture', 'IBM India', 'Capgemini', 'L&T Infotech', 'Mphasis', 'Mindtree',
  'Hexaware', 'NIIT', 'Persistent Systems', 'Zoho', 'Freshworks', 'Razorpay',
  'PhonePe', 'Flipkart', 'Amazon India', 'Google India', 'Microsoft India',
  'Deloitte', 'KPMG', 'EY India', 'PwC India', 'ICICI Bank', 'HDFC Bank',
  'Reliance', 'Tata Group', 'Bajaj', 'Mahindra', 'Bharti Airtel', 'Jio',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateJobDescription(role: typeof ROLES[0], city: string): string {
  const templates = [
    `We are looking for a ${role.title} to join our team in ${city}. Required skills: ${role.skills.join(', ')}. Competitive salary offered.`,
    `Hiring ${role.title} for our ${city} office. Experience with ${role.skills.slice(0, 3).join(', ')} required. ${role.aiTools.length > 0 ? `Familiarity with ${role.aiTools.join(', ')} is a plus.` : ''}`,
    `${role.title} position available in ${city}. We need someone skilled in ${role.skills.join(' and ')}. Join our growing team.`,
    `Urgent requirement: ${role.title} in ${city}. Must have hands-on experience with ${role.skills.slice(0, 4).join(', ')}. ${role.aiTools.length > 0 ? `Knowledge of AI tools like ${role.aiTools[0]} preferred.` : ''}`,
  ];
  return randomItem(templates);
}

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skills-mirage';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    JobListing.deleteMany({}),
    WorkerProfile.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // Generate job listings
  const jobs: any[] = [];
  const now = Date.now();

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const date = new Date(now - dayOffset * 86400_000);
    const listingsPerDay = randomBetween(30, 80);

    for (let i = 0; i < listingsPerDay; i++) {
      const role = randomItem(ROLES);
      const city = randomItem(CITIES);
      const salaryVariance = randomBetween(-20, 20) / 100;

      jobs.push({
        title: role.title,
        normalizedTitle: role.normalized,
        company: randomItem(COMPANIES),
        city,
        sector: role.sector,
        skills: role.skills.slice(0, randomBetween(2, role.skills.length)),
        salary: {
          min: Math.round(role.salaryRange[0] * (1 + salaryVariance)),
          max: Math.round(role.salaryRange[1] * (1 + salaryVariance)),
        },
        aiToolMentions: Math.random() < (role.aiRisk / 100) ? role.aiTools : [],
        source: Math.random() > 0.3 ? 'naukri' : 'linkedin',
        scrapedAt: date,
        rawDescription: generateJobDescription(role, city),
        vulnerabilitySignals: {
          aiReplacementRisk: role.aiRisk + randomBetween(-10, 10),
          hiringTrend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
          automationKeywords: role.aiTools,
        },
      });
    }
  }

  // Insert in batches
  const BATCH_SIZE = 500;
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    await JobListing.insertMany(jobs.slice(i, i + BATCH_SIZE));
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, jobs.length)}/${jobs.length} job listings`);
  }

  // Generate sample worker profiles
  const workers = [
    {
      jobTitle: 'Senior BPO Executive',
      normalizedTitle: 'bpo executive',
      city: 'Pune',
      yearsOfExperience: 8,
      writeUp: 'I handle customer complaints and manage a team of 12 agents. Good at de-escalation and training new hires. I want to move into operations management or data analytics.',
      extractedSkills: ['Customer Service', 'Team Management', 'Communication', 'Training', 'CRM'],
      extractedAspirations: ['Operations Management', 'Data Analytics'],
      extractedTools: ['CRM', 'Excel', 'Avaya'],
      riskScore: { current: 72, previous: 65, trend: 'rising', level: 'HIGH', factors: [
        { signal: 'BPO hiring in Pune: -18% over 30d', weight: 22 },
        { signal: 'AI tool mentions in JDs: 45%', weight: 17 },
        { signal: 'Automation feasibility: 82/100', weight: 16 },
      ]},
      reskillPath: {
        targetRole: 'Data Analyst',
        targetCity: 'Pune',
        isHiringVerified: true,
        totalWeeks: 16,
        hoursPerWeek: 10,
        steps: [
          { weekRange: 'Week 1-4', courseName: 'Python for Data Science', provider: 'NPTEL', institution: 'IIT Madras', url: 'https://nptel.ac.in/courses/106106212', duration: '4 weeks', isFree: true },
          { weekRange: 'Week 5-8', courseName: 'SQL for Data Analysis', provider: 'SWAYAM', institution: 'IIT Bombay', url: 'https://swayam.gov.in/nd2_noc20_cs48', duration: '4 weeks', isFree: true },
          { weekRange: 'Week 9-12', courseName: 'Data Visualization with Tableau', provider: 'Coursera', url: 'https://www.coursera.org/learn/data-visualization', duration: '4 weeks', isFree: false },
          { weekRange: 'Week 13-16', courseName: 'Business Analytics', provider: 'NPTEL', institution: 'IIT Kharagpur', url: 'https://nptel.ac.in/courses/110105089', duration: '4 weeks', isFree: true },
        ],
      },
    },
    {
      jobTitle: 'Data Entry Clerk',
      normalizedTitle: 'data entry operator',
      city: 'Indore',
      yearsOfExperience: 3,
      writeUp: 'I do data entry for insurance forms and maintain Excel sheets. Fast typing speed. Want to learn computers more and maybe coding.',
      extractedSkills: ['Data Entry', 'Excel', 'Typing', 'MS Office'],
      extractedAspirations: ['Coding', 'Computer Skills'],
      extractedTools: ['Excel', 'MS Office'],
      riskScore: { current: 85, previous: 80, trend: 'rising', level: 'CRITICAL', factors: [
        { signal: 'Data entry hiring in Indore: -35% over 30d', weight: 28 },
        { signal: 'AI tool mentions in JDs: 52%', weight: 20 },
        { signal: 'Automation feasibility: 78/100', weight: 16 },
      ]},
    },
    {
      jobTitle: 'Junior Software Developer',
      normalizedTitle: 'software developer',
      city: 'Bangalore',
      yearsOfExperience: 2,
      writeUp: 'I work with React and Node.js building web apps. Learning TypeScript. Want to become a full-stack engineer and eventually move into AI/ML.',
      extractedSkills: ['JavaScript', 'React', 'Node.js', 'HTML', 'CSS', 'Git'],
      extractedAspirations: ['Full Stack', 'AI/ML'],
      extractedTools: ['VS Code', 'Git', 'MongoDB'],
      riskScore: { current: 18, previous: 20, trend: 'falling', level: 'LOW', factors: [
        { signal: 'Software developer hiring in Bangalore: +12% over 30d', weight: 5 },
        { signal: 'AI tool mentions in JDs: 15%', weight: 6 },
        { signal: 'Automation feasibility: 15/100', weight: 3 },
      ]},
    },
  ];

  await WorkerProfile.insertMany(workers);
  console.log(`Inserted ${workers.length} worker profiles`);

  console.log('\nSeed complete!');
  console.log(`Total job listings: ${jobs.length}`);
  console.log(`Total worker profiles: ${workers.length}`);
  console.log(`Cities covered: ${CITIES.length}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
