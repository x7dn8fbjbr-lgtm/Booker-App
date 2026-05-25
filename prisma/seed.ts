import { PrismaClient, VenueType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Beispiel-Venues für Deutschland (TODO: echte Datenquelle per offene-frage-2)
  const venues = [
    {
      name: "Berghain",
      city: "Berlin",
      street: "Am Wriezener Bahnhof",
      zip: "10243",
      capacity: 1500,
      type: VenueType.CLUB,
      genreTags: ["Techno", "Electronic"],
    },
    {
      name: "Hamburger Bahnhof",
      city: "Berlin",
      street: "Invalidenstraße 50–51",
      zip: "10557",
      capacity: 3000,
      type: VenueType.THEATER,
      genreTags: ["Jazz", "Klassik", "Pop"],
    },
    {
      name: "Molotow",
      city: "Hamburg",
      street: "Nobistor 14",
      zip: "22767",
      capacity: 350,
      type: VenueType.CLUB,
      genreTags: ["Indie", "Rock", "Alternative"],
    },
    {
      name: "Ampere",
      city: "München",
      street: "Zellstraße 4",
      zip: "81667",
      capacity: 1500,
      type: VenueType.CLUB,
      genreTags: ["Electronic", "Techno", "Pop"],
    },
    {
      name: "Hirsch",
      city: "Nürnberg",
      street: "Vogelweiherstraße 66",
      zip: "90441",
      capacity: 700,
      type: VenueType.CLUB,
      genreTags: ["Rock", "Metal", "Alternative"],
    },
  ];

  for (const venue of venues) {
    await prisma.venue.upsert({
      where: { id: `seed-${venue.name.toLowerCase().replace(/\s/g, "-")}` },
      create: { id: `seed-${venue.name.toLowerCase().replace(/\s/g, "-")}`, ...venue },
      update: {},
    });
  }

  console.log(`Seeded ${venues.length} venues.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
