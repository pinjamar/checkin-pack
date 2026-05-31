# eVisitor autofill — koraci

1. Gost popuni formu → status postane `completed` u dashboardu
2. Kopiraj `id` bookinga iz Supabase → Table Editor → bookings
3. Zalijepi u `.dev.vars`: `AUTOFILL_BOOKING_ID=taj-id`
4. Pokreni: `npm run test:autofill`
5. Browser se otvori i popuni formu — provjeri **Spol** i klikni **Prijavi**
6. U dashboardu klikni **Označi kao registrirano**
