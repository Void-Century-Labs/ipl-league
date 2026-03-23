export interface SeedOwner {
  name: string;
}

export interface SeedPlayer {
  name: string;
  ipl_team: string;
  owner: string;
  purse_spent: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export const OWNERS: SeedOwner[] = [
  { name: "Manan" },
  { name: "Samay" },
  { name: "Praveen" },
  { name: "Dhruv" },
  { name: "Nirbhay" },
  { name: "Ayushmaan" },
  { name: "Kaif" },
];

export const PLAYERS: SeedPlayer[] = [
  // --- Manan ---
  { name: "Quinton de Kock", ipl_team: "MI", owner: "Manan", purse_spent: 600, is_captain: false, is_vice_captain: false },
  { name: "Shubman Gill", ipl_team: "PBKS", owner: "Manan", purse_spent: 3400, is_captain: false, is_vice_captain: false },
  { name: "Aiden Markram", ipl_team: "LSG", owner: "Manan", purse_spent: 3100, is_captain: false, is_vice_captain: false },
  { name: "Jos Buttler", ipl_team: "GT", owner: "Manan", purse_spent: 2700, is_captain: false, is_vice_captain: false },
  { name: "Jasprit Bumrah", ipl_team: "MI", owner: "Manan", purse_spent: 2000, is_captain: false, is_vice_captain: false },
  { name: "Ravindra Jadeja", ipl_team: "RR", owner: "Manan", purse_spent: 1000, is_captain: false, is_vice_captain: false },
  { name: "Riyan Parag", ipl_team: "RR", owner: "Manan", purse_spent: 600, is_captain: false, is_vice_captain: false },
  { name: "Yashasvi Jaiswal", ipl_team: "RR", owner: "Manan", purse_spent: 3500, is_captain: false, is_vice_captain: false },
  { name: "Travis Head", ipl_team: "DC", owner: "Manan", purse_spent: 1600, is_captain: false, is_vice_captain: false },
  { name: "Mohammed Shami", ipl_team: "SRH", owner: "Manan", purse_spent: 400, is_captain: false, is_vice_captain: false },
  { name: "Mukesh Kumar Porel", ipl_team: "KKR", owner: "Manan", purse_spent: 1100, is_captain: false, is_vice_captain: false },

  // --- Samay ---
  { name: "Mitchell Marsh", ipl_team: "LSG", owner: "Samay", purse_spent: 3000, is_captain: false, is_vice_captain: false },
  { name: "Anuj Rawat Raghvanshi", ipl_team: "KKR", owner: "Samay", purse_spent: 1000, is_captain: false, is_vice_captain: false },
  { name: "Bhuvneshwar Kumar", ipl_team: "RCB", owner: "Samay", purse_spent: 1100, is_captain: false, is_vice_captain: false },
  { name: "Shardul Thakur", ipl_team: "MI", owner: "Samay", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Rajat Patidar", ipl_team: "RCB", owner: "Samay", purse_spent: 1500, is_captain: false, is_vice_captain: false },
  { name: "Tilak Varma", ipl_team: "MI", owner: "Samay", purse_spent: 1500, is_captain: false, is_vice_captain: false },
  { name: "Prabhsimran Singh", ipl_team: "PBKS", owner: "Samay", purse_spent: 700, is_captain: false, is_vice_captain: false },
  { name: "Trent Boult", ipl_team: "MI", owner: "Samay", purse_spent: 800, is_captain: false, is_vice_captain: false },
  { name: "Ayush Mhatre", ipl_team: "CSK", owner: "Samay", purse_spent: 2600, is_captain: false, is_vice_captain: false },
  { name: "Harshal Patel", ipl_team: "SRH", owner: "Samay", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Khaleel Ahmed", ipl_team: "CSK", owner: "Samay", purse_spent: 7600, is_captain: false, is_vice_captain: false },

  // --- Praveen ---
  { name: "Finn Allen", ipl_team: "KKR", owner: "Praveen", purse_spent: 2700, is_captain: false, is_vice_captain: false },
  { name: "Ajinkya Rahane", ipl_team: "KKR", owner: "Praveen", purse_spent: 1200, is_captain: false, is_vice_captain: false },
  { name: "Shimron Hetmyer", ipl_team: "RR", owner: "Praveen", purse_spent: 1300, is_captain: false, is_vice_captain: false },
  { name: "Nicholas Pooran", ipl_team: "LSG", owner: "Praveen", purse_spent: 1800, is_captain: false, is_vice_captain: false },
  { name: "Jitesh Sharma", ipl_team: "RCB", owner: "Praveen", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Yuzvendra Chahal", ipl_team: "PBKS", owner: "Praveen", purse_spent: 1700, is_captain: false, is_vice_captain: false },
  { name: "Axar Patel", ipl_team: "DC", owner: "Praveen", purse_spent: 1000, is_captain: false, is_vice_captain: false },
  { name: "Virat Kohli", ipl_team: "RCB", owner: "Praveen", purse_spent: 9300, is_captain: false, is_vice_captain: false },
  { name: "Ravi Bishnoi", ipl_team: "GT", owner: "Praveen", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Nitish Kumar Reddy", ipl_team: "SRH", owner: "Praveen", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Dhruv Jurel", ipl_team: "RR", owner: "Praveen", purse_spent: 700, is_captain: false, is_vice_captain: false },

  // --- Dhruv ---
  { name: "Dewald Brevis", ipl_team: "CSK", owner: "Dhruv", purse_spent: 800, is_captain: false, is_vice_captain: false },
  { name: "Wanindu Hasaranga", ipl_team: "LSG", owner: "Dhruv", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Rohit Sharma", ipl_team: "MI", owner: "Dhruv", purse_spent: 4000, is_captain: false, is_vice_captain: false },
  { name: "Jake Fraser-McGurk", ipl_team: "DC", owner: "Dhruv", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Sai Sudarshan", ipl_team: "GT", owner: "Dhruv", purse_spent: 3800, is_captain: false, is_vice_captain: false },
  { name: "Marco Jansen", ipl_team: "PBKS", owner: "Dhruv", purse_spent: 1800, is_captain: false, is_vice_captain: false },
  { name: "Ruturaj Gaikwad", ipl_team: "CSK", owner: "Dhruv", purse_spent: 2500, is_captain: false, is_vice_captain: false },
  { name: "Jacob Bethell", ipl_team: "RCB", owner: "Dhruv", purse_spent: 1000, is_captain: false, is_vice_captain: false },
  { name: "Shreyas Iyer", ipl_team: "PBKS", owner: "Dhruv", purse_spent: 3400, is_captain: false, is_vice_captain: false },
  { name: "Kuldeep Yadav", ipl_team: "DC", owner: "Dhruv", purse_spent: 1200, is_captain: false, is_vice_captain: false },
  { name: "Krunal Pandya", ipl_team: "RR", owner: "Dhruv", purse_spent: 1300, is_captain: false, is_vice_captain: false },

  // --- Nirbhay ---
  { name: "Ramandeep Singh", ipl_team: "GT", owner: "Nirbhay", purse_spent: 300, is_captain: false, is_vice_captain: false },
  { name: "Arshdeep Singh", ipl_team: "PBKS", owner: "Nirbhay", purse_spent: 1500, is_captain: false, is_vice_captain: false },
  { name: "Rashid Khan", ipl_team: "GT", owner: "Nirbhay", purse_spent: 2000, is_captain: false, is_vice_captain: false },
  { name: "Rahul Chahar", ipl_team: "CSK", owner: "Nirbhay", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Rishabh Pant", ipl_team: "LSG", owner: "Nirbhay", purse_spent: 3200, is_captain: false, is_vice_captain: false },
  { name: "Ishan Kishan", ipl_team: "SRH", owner: "Nirbhay", purse_spent: 4000, is_captain: false, is_vice_captain: false },
  { name: "Prithvi Shaw", ipl_team: "DC", owner: "Nirbhay", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Will Jacks", ipl_team: "RCB", owner: "Nirbhay", purse_spent: 1400, is_captain: false, is_vice_captain: false },
  { name: "KL Rahul", ipl_team: "DC", owner: "Nirbhay", purse_spent: 2500, is_captain: false, is_vice_captain: false },
  { name: "Vaibhav Suryavanshi", ipl_team: "RR", owner: "Nirbhay", purse_spent: 2400, is_captain: false, is_vice_captain: false },
  { name: "Phil Salt", ipl_team: "RCB", owner: "Nirbhay", purse_spent: 2500, is_captain: false, is_vice_captain: false },

  // --- Ayushmaan ---
  { name: "Hardik Pandya", ipl_team: "MI", owner: "Ayushmaan", purse_spent: 4000, is_captain: false, is_vice_captain: true },
  { name: "Shubman Gill", ipl_team: "GT", owner: "Ayushmaan", purse_spent: 5000, is_captain: true, is_vice_captain: false },
  { name: "Sunil Narine", ipl_team: "KKR", owner: "Ayushmaan", purse_spent: 1400, is_captain: false, is_vice_captain: false },
  { name: "Shivam Dube", ipl_team: "CSK", owner: "Ayushmaan", purse_spent: 700, is_captain: false, is_vice_captain: false },
  { name: "Lockie Ferguson", ipl_team: "KKR", owner: "Ayushmaan", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "David Miller", ipl_team: "GT", owner: "Ayushmaan", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Tim David", ipl_team: "RCB", owner: "Ayushmaan", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Jofra Archer", ipl_team: "RR", owner: "Ayushmaan", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Tim Siefert", ipl_team: "KKR", owner: "Ayushmaan", purse_spent: 500, is_captain: false, is_vice_captain: false },
  { name: "Mohammed Siraj", ipl_team: "GT", owner: "Ayushmaan", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Venkatesh Iyer", ipl_team: "RCB", owner: "Ayushmaan", purse_spent: 7900, is_captain: false, is_vice_captain: false },

  // --- Kaif ---
  { name: "Prasidh Krishna", ipl_team: "GT", owner: "Kaif", purse_spent: 500, is_captain: false, is_vice_captain: false },
  { name: "Sanju Samson", ipl_team: "CSK", owner: "Kaif", purse_spent: 3700, is_captain: false, is_vice_captain: false },
  { name: "Rahul Tripathi", ipl_team: "KKR", owner: "Kaif", purse_spent: 700, is_captain: false, is_vice_captain: false },
  { name: "Noor Ahmad", ipl_team: "CSK", owner: "Kaif", purse_spent: 800, is_captain: false, is_vice_captain: false },
  { name: "Marcus Stoinis", ipl_team: "PBKS", owner: "Kaif", purse_spent: 600, is_captain: false, is_vice_captain: false },
  { name: "Suryakumar Yadav", ipl_team: "MI", owner: "Kaif", purse_spent: 2500, is_captain: false, is_vice_captain: false },
  { name: "Rasik Salam Dhar", ipl_team: "MI", owner: "Kaif", purse_spent: 100, is_captain: false, is_vice_captain: false },
  { name: "Varun Chakravarthy", ipl_team: "KKR", owner: "Kaif", purse_spent: 1200, is_captain: false, is_vice_captain: false },
  { name: "Cameron Green", ipl_team: "KKR", owner: "Kaif", purse_spent: 1500, is_captain: false, is_vice_captain: false },
  { name: "Heinrich Klaasen", ipl_team: "SRH", owner: "Kaif", purse_spent: 1600, is_captain: false, is_vice_captain: false },
  { name: "Abhishek Sharma", ipl_team: "SRH", owner: "Kaif", purse_spent: 6800, is_captain: false, is_vice_captain: false },
];
