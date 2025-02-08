import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const users = [
  {
    username: 'john_doe_2',
    password: 'password123',
    email: 'john.doe@example.com',
    role: 'guest',
  },
  {
    username: 'jane_doe_1',
    password: 'password456',
    email: 'jane.doe@example.com',
    role: 'host',
  },
  {
    username: 'anique_petit',
    password: 'Winc123',
    email: 'aniquepetit@hotmail.com',
    role: 'admin',
  }
];

const properties = [
  {
    name: 'Luxury Apartment',
    pricePerNight: 120.5,
    description: 'A luxurious apartment in the city center',
    location: 'City Center',
    hostId: 2,  // Host is user with id 2
  },
  {
    name: 'Cozy Cottage',
    pricePerNight: 75.0,
    description: 'A cozy cottage in the countryside',
    location: 'Countryside',
    hostId: 3,  // Host is user with id 3
  },
];

async function main() {
  // Voeg gebruikers toe met gehashte wachtwoorden
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.create({ data: { ...user, password: hashedPassword } });
  }

  // Voeg properties toe
  for (const property of properties) {
    await prisma.property.create({ data: property });
  }

  console.log('Data has been seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
