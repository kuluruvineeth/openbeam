export type Person = {
  id: string;
  name: string;
  email?: string;
  title?: string;
  department?: string;
  avatarUrl?: string;
  connectorType?: string;
};

export const MOCK_PEOPLE_DATA: Person[] = [
  {
    id: "p1",
    name: "Sarah Chen",
    email: "sarah.chen@acme.com",
    title: "Staff Engineer",
    department: "Engineering",
    connectorType: "GOOGLE_WORKSPACE",
  },
  {
    id: "p2",
    name: "Marcus Rivera",
    email: "m.rivera@acme.com",
    title: "Product Manager",
    department: "Product",
    connectorType: "SLACK",
  },
  {
    id: "p3",
    name: "Anika Patel",
    email: "anika.patel@acme.com",
    title: "Security Lead",
    department: "Security",
    connectorType: "GITHUB",
  },
  {
    id: "p4",
    name: "James Okonkwo",
    email: "j.okonkwo@acme.com",
    title: "Design Director",
    department: "Design",
    connectorType: "NOTION",
  },
  {
    id: "p5",
    name: "Lin Zhao",
    email: "lin.zhao@acme.com",
    title: "Data Scientist",
    department: "Machine Learning",
    connectorType: "CONFLUENCE",
  },
];
