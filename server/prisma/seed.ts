import { prisma } from '../src/lib/prisma.js'
import { DEMO_PASSWORD, DEMO_PROVIDER_PASSWORD, seedDatabase } from '../src/lib/seed.js'

seedDatabase()
  .then((summary) => {
    console.log('Seed complete.')
    console.log(`  specialties  ${summary.specialties}`)
    console.log(`  providers    ${summary.providers}`)
    console.log(`  slots        ${summary.slots}`)
    console.log(`  patients     ${summary.patients}`)
    console.log(`  appointments ${summary.appointments}`)
    console.log(`  documents    ${summary.documents}`)
    console.log(`  conversations ${summary.conversations}`)
    console.log(`  messages     ${summary.messages}`)
    console.log(`  demo password ${DEMO_PASSWORD}`)
    console.log(`  doctor password ${DEMO_PROVIDER_PASSWORD}`)
  })
  .catch((error: unknown) => {
    console.error('Seed failed.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
