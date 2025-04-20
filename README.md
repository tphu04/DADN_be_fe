# install package for be and fe
npm i

# connect database local

cd .\be-DADN-watering-system\config\prisma\

npx prisma migrate dev --name init

npx prisma generate

# change URL connect

search localhost:3000 and uncomment it
comment url of vercel.app

# run server be
npm run dev

# run fe
npm run dev
