
# AI/Felsökningsstrategi för Maskinstopp

Detta dokument beskriver den initiala strategin för att automatiskt analysera och identifiera grundorsaken till maskinstopp.

## 1. Definition av ett Maskinstopp

Ett "maskinstopp" definieras som en händelse där en central "kör"-signal från PLC:n övergår från `TRUE` till `FALSE`. Denna signal måste identifieras för varje maskintyp (t.ex., `Machine_Running`, `System_Active`).

## 2. Metodik: Datafångst vid Stopp

När ett stopp detekteras ska systemet automatiskt:

1.  **Registrera tidpunkten** för stoppet (`T_stop`).
2.  **Hämta en högupplöst "snapshot"** av fördefinierade kritiska signaler från databasen. Denna snapshot bör täcka tidsintervallet från 30 sekunder före stoppet till 5 sekunder efter (`T_stop - 30s` till `T_stop + 5s`).

## 3. Kritiska Signaltyper för Analys

Följande typer av signaler är avgörande för en effektiv grundorsaksanalys och bör prioriteras för insamling:

### Digitala Ingångar (Inputs)
- **Nödstoppskretsar:** (`E-Stop_Pushed`, `Safety_Gate_Open`) - Oftast den direkta orsaken.
- **Säkerhetsutrustning:** (`Light_Curtain_Broken`, `Area_Scanner_Tripped`)
- **Tillståndsgivare:** (`Overload_Trip`, `Motor_Fault`, `Low_Air_Pressure`)
- **Manöverorgan:** (`Stop_Button_Pressed`)

### Digitala Utgångar (Outputs)
- **Motor- och driftssignaler:** (`Motor_Run_Command`, `Main_Contactor_Enable`) - Att se när kommandot att köra försvinner är lika viktigt som att se när ett fel inträffar.

### Analoga Värden
- **Motorström:** En plötslig spik kan indikera en mekanisk blockering.
- **Tryck/Flöde:** Ett snabbt fall kan indikera läckage eller pumpfel.
- **Temperatur:** Överhettning kan leda till ett termiskt utlöst stopp.

## 4. Initiala Analysregler (Regelbaserat System)

Den första versionen av AI-analysen kommer att vara ett enkelt regelbaserat system. Systemet letar i "snapshot"-datan efter den första avvikande signalen som kan förklara stoppet.

**Exempel på regler (prioriterad ordning):**
1.  **IF** `E-Stop_Pushed` ändras till `TRUE` inom snapshot-fönstret -> **Grundorsak: Nödstopp.**
2.  **ELSE IF** `Safety_Gate_Open` ändras till `TRUE` -> **Grundorsak: Skyddsgrind öppnad.**
3.  **ELSE IF** `Motor_Fault` ändras till `TRUE` -> **Grundorsak: Motorfel.**
4.  **ELSE IF** `Motor_Run_Command` ändras till `FALSE` *före* `Machine_Running` gör det -> **Grundorsak: Stopp kommenderat av styrsystem/operatör.**
5.  **ELSE** -> **Grundorsak: Okänd (kräver manuell analys).**

Denna strategi lägger grunden för en enkel men kraftfull funktion för att snabbt felsöka de vanligaste orsakerna till maskinstopp.

