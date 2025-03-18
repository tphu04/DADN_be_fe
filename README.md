# install package for be and fe
npm install

# connect database

delete folder prisma

cd .\be-DADN-watering-system\config\prisma\

npx prisma migrate dev --name init

npx prisma generate

# run server be
npm run dev

# run fe
npm run dev
