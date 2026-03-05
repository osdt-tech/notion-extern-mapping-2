 VLB-REST-API
Spezifikation
Anwenderdokumentation für den Abruf von Metadaten-, Cover- und Mediendateien
technische-Version: v2 Dokument-Version: 2.17 Datum: 28.11.2024 Status: Freigabe

 Inhalt
Inhalt.................................................................................................................... 2 Änderungshistorie ............................................................................................... 7 Einleitung............................................................................................................. 9
3.1. Zielgruppe für diese Dokument ..................................................................... 9
3.2. Übersicht zu diesem Dokument..................................................................... 9
3.3. Weitere Hinweise zu diesem Dokument ........................................................ 9
3.3.1. Metadaten-Nutzer (inkl. Cover und Mediendateien) .......................... 10
3.3.2. Cover-Daten Nutzer ........................................................................... 10
3.3.3. Nutzer der Mediendateien ................................................................. 10
3.4. Alternativen zum Datenbezug über die VLB-API......................................... 10 VLB-API-Technologie........................................................................................ 11
4.1. Generelle API-Eigenschaften ...................................................................... 11
4.2. Funktionalitäten für den Datenabruf ............................................................ 11
4.3. Änderungen gegenüber der vorherigen Schnittstelle .................................. 12
4.3.1. Änderungen gegenüber der v1 REST- Schnittstelle (HTTPS-Hinweis) 12
4.3.2. Referenzpreisdarstellung in der API .................................................. 12
Aufruf und technische Einbindung der Schnittstelle .......................................... 12 5.1. Kommunikation mit der VLB-API ................................................................. 12
5.1.1. URL Live-Umgebung ......................................................................... 13
5.1.2. URL Test-Umgebung......................................................................... 13
5.2. Rückgabeformate ........................................................................................ 13
5.3. Feldinhalte in der Rückgabe........................................................................ 14
5.4. Fehler .......................................................................................................... 14
5.4.1. Fehlercodes ....................................................................................... 14
5.4.2. JSON-Fehlercodes ............................................................................ 14
5.4.3. Einschränkungen bei der Abfrage (Deep paging Sperre) .................. 15
5.5. Anmeldung an der API ................................................................................ 15 5.5.1. Access-Token zur API-Anmeldung.................................................... 15 Token je Nutzergruppe................................................................... 15 Token für die statusgebundene Anmeldung................................... 16
        VLB-REST-API Spezifikation 2 / 85

 Token für die statuslose Anmeldung .............................................. 16
5.5.2. Authentifizierung ................................................................................ 16
5.5.3. Statusgebundene Anmeldung mit Login............................................ 17
Login .............................................................................................. 17
Logout ............................................................................................ 18
5.5.4. Abfrage von Medienobjekten ............................................................. 18
5.5.5. Hinweise für den Einsatz eines Access-Token.................................. 18
5.5.6. Beschreibung..................................................................................... 18
5.6. Suche .......................................................................................................... 19
5.6.1. Schnellsuche ..................................................................................... 19
5.6.2. Boolesche Suche............................................................................... 19
Suchsyntax und Boolesche Operatoren ......................................... 22 Besondere Hinweise zur Booleschen Suche:................................. 23 Lesemotive in der booleschen Suche............................................. 24
5.6.3. Stapelsuche ....................................................................................... 25
5.6.4. Request ............................................................................................. 25 Rückgabe - Trefferliste ................................................................... 26
5.7. Liste von Produkteinträgen abrufen............................................................. 29
5.7.1. Request ............................................................................................. 29
5.7.2. Rückgabe - Liste Produkteinträge ..................................................... 29
5.8. Produkteintrag abrufen ................................................................................ 30
5.8.1. Rückgabe - Produkteintrag ................................................................ 30 JSON-long...................................................................................... 31 ONIX30 short.................................................................................. 31 ONIX30 ref ..................................................................................... 31
5.8.2. Request ............................................................................................. 32
5.8.3. Beispiel – Produkteintrag abrufen...................................................... 32
5.9. Mediendateien abrufen................................................................................ 33
5.9.1. Beschreibung..................................................................................... 33
5.9.2. Request ............................................................................................. 37
5.9.3. Rückgabe .......................................................................................... 37
5.9.4. Beispiel .............................................................................................. 37
          VLB-REST-API Spezifikation 3 / 85

 5.10. Cover abrufen .......................................................................................... 38
5.10.1. Beschreibung..................................................................................... 38
5.10.2. Cover-Request .................................................................................. 39
5.10.3. Rückgabe .......................................................................................... 39
5.11. Indexsuche............................................................................................... 40
5.11.1. Beschreibung..................................................................................... 40
5.11.2. Request ............................................................................................. 40
5.11.3. Rückgabe .......................................................................................... 41
5.11.4. Beispiel .............................................................................................. 41
5.12. Verlagsangaben abrufen .......................................................................... 41 5.12.1. Beschreibung..................................................................................... 41
5.12.1. Request ............................................................................................. 42
5.12.2. Rückgabe .......................................................................................... 42
5.12.3. Beispiel .............................................................................................. 43
5.13. Übersicht der Aggregatoren ..................................................................... 43 Beispiele für Abfragen und Rückmeldungen ..................................................... 44
6.1. Übersicht der API Aufrufe............................................................................ 44
6.2. Abfragen und Aufrufe .................................................................................. 44
6.3. Rückmeldungen der API.............................................................................. 46
6.3.1. Rückmeldungen der Login-Funktion.................................................. 46
6.3.2. Rückmeldungen für Metadaten Abruf ................................................ 47 Rückmeldungen beim Aufruf der Suche......................................... 47 Rückmeldungen beim Abruf von Artikeldaten................................. 48 Rückmeldungen beim Abruf von Verlagsdaten ............................. 48
6.3.3. Rückmeldungen für Cover- und Medienobjekte Abrufe ..................... 49
6.4. Beispieldaten............................................................................................... 49 Encodings.......................................................................................................... 50 7.1. HTML-Encoding .......................................................................................... 50 7.1. URL-Encoding ............................................................................................. 50 Kontakt .............................................................................................................. 51 Anhang.............................................................................................................. 52 9.1. Standards und Ausnahmen bei Blöcken und Datenfeldern ......................... 52
       VLB-REST-API Spezifikation 4 / 85

 9.2. Darstellung von Produkten mit Mehrwertsteuer-Splitting (Bundle-Produkte)52
9.3. Beispieldaten............................................................................................... 53
9.4. Hinweise zu den Feldern der Trefferliste ..................................................... 53
9.4.1. productType Werte ............................................................................ 59
9.4.2. Genre code – Hinweis zu der Warengruppen-Klassifikation.............. 59
9.4.3. Kennzeichnung Referenzpreis........................................................... 60
9.5. Übersicht der notwendigen ONIX Codelisten .............................................. 60
9.5.1. Felder ohne Klassenzugehörigkeit .................................................... 60
9.5.2. taxKeyEurD / taxKeyEurA / taxKeyChf ............................................. 62
9.5.3. ancillarycontents - Abbildungen ......................................................... 62
9.5.4. audiences - Zielgruppe und Altersempfehlung .................................. 63
9.5.5. citedContents – Zitierter Inhalt........................................................... 64
9.5.6. collections - Mehrbändige Werke – Reihen und Hierarchien ............. 64
9.5.7. contributors - Urheber ........................................................................ 65
9.5.8. copyrights .......................................................................................... 67
9.5.9. edition - Auflage................................................................................. 67
9.5.10. extent - Umfang ................................................................................. 68
Seitenzahlen................................................................................. 68 DRM-Art ....................................................................................... 69 Dateigröße.................................................................................... 69 Laufzeit, Track-Anzahl und Kartenmaßstab ................................. 70 Abbildungen ................................................................................. 70
9.5.11. form - Produktform............................................................................. 70
9.5.12. formFeatures - Warnhinweise............................................................ 71
9.5.13. identifiers- Produktnummern.............................................................. 72
9.5.14. languages - Produktsprache .............................................................. 72
9.5.15. prices - Preise.................................................................................... 73
9.5.15.1.1. taxes (innerhalb des Prices-Block) .....................................................74
9.5.16. prizes – Preisverleihung .................................................................... 74
9.5.17. productClassifications - Zolltarifnummer ............................................ 75
9.5.18. productParts – (v1: containeditems) - Teilprodukte und Beigaben .... 75
9.5.19. publisherData .................................................................................... 76
     VLB-REST-API Spezifikation 5 / 85

 9.5.20. publishers - Verlage........................................................................... 78
9.5.21. relatedProducts - Produktverweise .................................................... 78
9.5.22. salesRight - Verkaufsrechte............................................................... 79
9.5.23. subjects - Produktklassifikation.......................................................... 79
9.5.24. supportingResource - Mediendateien ................................................ 81
9.5.25. textContents - Zusatztexte ................................................................. 82
9.5.26. titles – Titel und Produktsprache ....................................................... 83
9.5.27. websites - Webseiten......................................................................... 84
9.5.28. wholesalers – Auslieferer- und Barsortimentssigel ............................ 84
9.5.29. productContacts – Kontaktadressen und Produktsicherheit .............. 84
VLB-REST-API Spezifikation 6 / 85

 Änderungshistorie
   Datum
   Version
   Änderung
   Kommentar
 20.06.2017
06.07.2018
1.5
2.0
Initiales Dokument
finalisiert
  14.06.2018
    1.9
      Hinweise zum Unterschiede v1 und v2 4.3.1 Änderungen gegenüber der REST-API v1 Schnittstelle
   18.09.2018
   2.1
  Hinweis zu Originalcover Größen Abruf, promotionCampaign und marketPublishingStatus eingefügt, Fehlermeldungen überarbeitet
    07.12.2018
    2.3
   Korrektur URL in Kapitel5.6.4,
ISNI, ORCID GND in 5.6.2
   Korrektur des Status- Parameter in der Bsp Url, Ergänzung der booleschen Abfrage um weitere Parameter,
 19.12.2018
12.11.2019
2.4
2.7
Hinweis zu http und HTTPS in 4.3.1
Product not Found angepasst in 6.3 Rückmeldungen der API
Hinweis zur http / HTTPS Verwendung bzw. redirect
product not found in vlb angepasst in product not found
  27.05.2019
   2.5
  Mediendateien Kennzeichnung auf ONIX 3 Basis
  Die Kennzeichnung einiger Medientypen hat sich geändert andere sind neu hinzugekommen
  19.08.2019
    2.6
   Korrektur Codelisten Verlinkung
   9.5.11. form - Produktform 9.5.24. supportingResource - Mediendateien
   30.07.2020
   2.8
  Produkttyp multiBundle entfernt
  5.6 Suche
6. Beispiele für Abfragen und Rückmeldungen
Es wird zukünftig keine Multibundle Produkte (mehr als 2 Teilprodukte mit unterschiedlicher MwsT) geben Suchparameter „?“ wurde entfernt.
  21.10.2020
    2.9
   Thema-Suche verfeinert, Tippfehler in Feldname, JPG- und PNG- Bilddateien über die REST-API
   Es kann bei der Suche nach Thema-Inhalte und Thema-Qualifier getrennt voneinander gesucht werden.
 VLB-REST-API Spezifikation
7 / 85

             Auslieferung von JPG- und PNG-Dateien über die REST-API
Tippfehler in Feldname audienceRangQualifier in die Spezifikation aufgenommen 9.5.4
 07.12.2020 06.08.2021
31.05.2022
2.10 2.12
2.14
Deep-Paging bei der API wird geblockt (6.3.2.1)
Lesemotive ergänzt
Text und Tabelle der Medientypen überarbeitet
Eine zu hohe Seitenzahl wird mit einem Fehler quittiert.
5.6.2.3 Lesemotive in der booleschen Suche
Kapitel 5.9 zu den Mediendatein überarbeitet
      29.03.2022
    2.13
   Liste der Mediendateitypen erweitert
   Spiel- oder Bauanleitung sowie Marketinggrafik wurden in Tabelle in 5.9.1 Beschreibung ergänzt
   11.06.2024
    2.15
   In Kapitel 5.12. und 9.5.19 Änderungen und Beispiel zum Abruf ergänzt
   Kapitel 5.12. und 9.5.19 Änderungen zum Abruf der Verlagsangaben
  07.11.2024
   2.16
  Kapitel 9.5.19 angepasst Kapitel 9.5.29 hinzugefügt
  Kapitel 9.5.19 publishersData Feldänderungen/- anpassungen Kapitel 9.5.29 productContacts neu
 28.11.2024
2.17
Kontaktangaben aktualisiert
    VLB-REST-API Spezifikation
8 / 85

 Einleitung
3.1. Zielgruppe für diese Dokument
Die folgende Spezifikation ist für Dienstleister zur Programmierung des Zugriffs auf die VLB-Daten, die Cover sowie Mediendateien gedacht. Programmierkenntnisse zur Einbindung einer REST-Schnittstelle werden 5.12. vorausgesetzt.
3.2. Übersicht zu diesem Dokument
• Allgemeine Erläuterung der API Technologie erfolgen in den Kapiteln 3 bis 4
• Die Anbindung der Schnittstelle sowie Fehlermeldungen und
Rückgabeformate werden in Kapitel 5.1 , 5.2 und 5.3 neben den URLs zum
Aufruf der Schnittstelle im Livesystem beschrieben.
• Die Anmeldung an der Schnittstelle wird im Kapitel 5.5 Anmeldung an der API
behandelt
• Suchfunktionen und Trefferliste sind in Kapitel 5.6 beschrieben. Darunter
fallen auch die Boolesche Suche sowie die Felder der Trefferliste in zwei
JSON Formaten.
• Den Titeldetailaufruf in unterschiedlichen Formaten beschreiben Kapitel 5.7
und 5.80
• Felder die in der vorliegenden API-Spezifikation nicht enthalten sind, sind vom
Anwender nicht zu berücksichtigen. Erst mit Aufnahme in die Spezifikation
erhalten die Felder ihre Gültigkeit
• Beispielaufrufe in Kapitel 6 Beispiele für Abfragen und Rückmeldungen
• Beispieldatensätze im JSON-Format sind über die Seite
https://vlb.de/leistungen/api-spezifikation unter dem Link „Beispiele V2“ als ZIP-Datei abrufbar. (6.4 Beispieldaten Verweis auf diesen Link)
3.3. Weitere Hinweise zu diesem Dokument
Zukünftige Versionen der API-Dokumentation werden unter die Online-Hilfe des VLB bereitgestellt.
Das Dokument enthält Hinweise zur Nutzung der API:
1. für Nutzer der Metadaten, Cover und Mediendateien
2. für Nutzer, die ausschließlich berechtigt sind Cover-Daten abzurufen (Cover-
API)
3. für Nutzer, die ausschließlich berechtigt sind Mediendateien (inkl. Cover)
abzurufen
   VLB-REST-API Spezifikation 9 / 85

 Die für die jeweilige Nutzergruppe relevanten Kapitel werden nachfolgend aufgelistet.
3.3.1. Metadaten-Nutzer (inkl. Cover und Mediendateien)
Für den Abruf aller Daten – Metadaten, Cover und Mediendateien – ist das gesamte Dokument zu beachten.
3.3.2. Cover-Daten Nutzer
Nutzer, die ausschließlich Cover abrufen, beachten bitte die folgenden Kapitel:
- Kapitel 1 Inhalt bis Kapitel 5.3 Feldinhalte in der Rückgabe
- Kapitel 5.5 Anmeldung an der API
- Kapitel 5.5.1 Access-Token zur API-Anmeldung
- Kapitel 5.5.1.1 Token je Nutzergruppe
- Kapitel 5.5.1.3 Token für die statuslose Anmeldung
- Kapitel 5.10 Cover abrufen
3.3.3. Nutzer der Mediendateien
Für Nutzer, die auf alle Mediendateien zugreifen, sind die folgenden Kapitel relevant:
- Kapitel 1 Inhalt bis Kapitel 5.3 Feldinhalte in der Rückgabe
- Kapitel 5.5 Anmeldung an der API
- Kapitel 5.5.1 Access-Token zur API-Anmeldung
- Kapitel 5.5.1.1 Token je Nutzergruppe
- Kapitle 5.5.1.3 Token für die statuslose Anmeldung
- Kapitel 5.9 Mediendateien abrufen
3.4. Alternativen zum Datenbezug über die VLB-API
Alternativ zum Datenbezug über die VLB-API können VLB-Daten im ONIX-Format über einen FTP-Zugang bezogen werden.
Neben den ONIX Daten sind auch die Mediendateien (inkl. Cover) per FTP zu beziehen.
Zur Einrichtung des Zugangs zu den ONIX- Daten oder Mediendateien wenden Sie sich bitte an den MVB-Kundenservice mit den unter Kapitel „8 Kontakt“ genannten Kontaktdaten.
VLB-REST-API Spezifikation 10 / 85

 VLB-API-Technologie
Die VLB-API baut auf die REST-Technologie (Representational State Transfer) auf. Damit ergeben sich gegenüber der zuvor verwendeten SOAP-Technologie Änderungen und Vorteile in der Anwendung und Performance.
4.1. Generelle API-Eigenschaften
Die generellen Eigenschaften der VLB-API sind:
- Die VLB-Schnittstelle nutzt als Authentifizierungsmethode OAuth2 mit einem vereinfachten Autorisierungsverfahren, das für die weitere Kommunikation ein Token verwendet.
- Jeder Datensatz erhält eine eindeutige ID, eine 32-stellige alphanumerische sogenannte GUID (Globally Unique Identifier).
- Es stehen zwei grundsätzliche Datenformate zur Verfügung – JSON (Java Script Object Notation) sowie ONIX in der version 2.1 und 3.1.
- Das JSON-Format ist in einen JSON-Wrapper verpackt, der pro Suchanfrage die Gesamtanzahl der Treffer, die Gesamtzahl der Seiten, die Anzahl Treffer pro Seite sowie die Seitenzahl zurückgibt.
- Für die Fehlerbehandlung greift die Schnittstelle auf die gängigen HTML- Status- und -Fehlercodes zurück. Fehler werden im Ergebnis genauer spezifiziert.
- Für einen einfachen Umgang mit unterschiedlichen Versionen wird die VLB- REST-API eine Versionsinformation in der URL enthalten, so dass bestehende Applikationen auch bei einem API-Update für eine Übergangsphase ohne Änderungen weiter genutzt werden können.
- Die API kann sowohl für individuelle Einzelplatz-Lösungen als auch für Webshops genutzt werden.Die grundsätzliche Konfiguration wird von der MVB vorgenommen.
-
4.2. Funktionalitäten für den Datenabruf
Die VLB-REST-API bietet ähnliche Funktionalitäten wie auch die vorherigen VLB- APIs:
- LogIn / LogOut
- Verschiedene Suchmethoden (Schnellsuche, Boolesche Suche, Hierarchie-
und Reihensuche)
- Rückgabe in verschiedenen Formaten (JSON, ONIX 2.1 und ONIX 3.1)
- Trefferliste in zwei unterschiedlichen Feldzusammenstellungen
- Artikeldetailangaben abrufbar auf Basis einer ID
- Abruf der URL zum Artikelcover
 VLB-REST-API Spezifikation
11 / 85

 - Abruf der URL zu weiteren Mediendateien
- Abruf der Verlagsangaben auf Basis einer Verlags-ID
- Aufruf von Indizes für verschiedene Felder
4.3. Änderungen gegenüber der vorherigen Schnittstelle
4.3.1. Änderungen gegenüber der v1 REST- Schnittstelle (HTTPS-Hinweis)
Gegenüber der REST-API v1 haben sich einige Änderumgen ergeben.
- Felder für die kein Wert vorliegt werden nicht angezeigt. D.h. es gibt keine „null“-Wert Felder mehr
- Im Detail-Aufruf wird kein json-short Format mehr bereitgestellt. Es steht ausschließlich das JSON Format (json long) zur Verfügung.
- Das explizite Preisreferenzkennzeichen entfällt. Stattdessen werden die Felder zur Ermmittlung der Preisreferenz übergeben.
- Die Schnittstelle verwendet nativ HTTPS. http Aufrufe werden auf HTTPS mit dem Status-Code 308 weitergeleitet.
4.3.2. Referenzpreisdarstellung in der API
Jeder gebundene Preis der keine ca.-Preisangabe hat ist ein Referenzpreis. Die explizite Referenzpreisangabe über ein eigenes Feld entfällt in der Version 2 der Rest-API.
Die Felder für die Angabe des gebundenen sowie die Angabe zu der ca.- Preisangabe sind sowohl in der Trefferliste wie auch im Detail eines Produktes verfügbar.
Aufruf und technische Einbindung der Schnittstelle
5.1. Kommunikation mit der VLB-API
Der Aufruf der VLB-REST-API erfolgt über URLs, innerhalb derer Server, Funktion und Parameter definiert werden müssen. Im Request-Header müssen der Zugangstoken und bei Produktabfragen das Rückgabeformat [JSON ( long) oder ONIX (short, ref)] angegeben werden.
Allgemeines URL-Format:
VLB-REST-API Spezifikation 12 / 85
 
 https://api.vlb.de/api/v2/<function>?<parameter>
Der Aufruf sollte verschlüsselt per HTTPS erfolgen (siehe 4.3.1 Änderungen gegenüber der v1 REST- Schnittstelle (HTTPS-Hinweis) ). Im Falle von zur Vorversion inkompatiblen Änderungen an Funktionsaufrufen wird die Versionsnummer (im Beispiel oben v1) inkrementiert (v2, v3, usw.). Dies trifft insbesondere auf Feldlöschungen oder Typänderungen zu, die eine Anpassung am Client-System erfordern.
Jeder Funktionsaufruf kann Fehler zurückliefern – Fehlercodes sind im Kapitel 5.4 Fehler, sonstige Rückmeldungen der API sind in Kapitel 6.3 Rückmeldungen der API aufgelistet. Zusätzlich werden sprechende Fehlermeldungen in JSON ausgegeben.
Für alle im Folgenden erwähnten Requests wird, sofern nicht anders beschrieben, ein HTTP GET verwendet.
5.1.1. URL Live-Umgebung
Die Live-Umgebung der API für den produktiven Betrieb ist unter folgender URL erreichbar:
https://api.vlb.de/api/v2/<function>?<parameter>
Die Live-Umgebung wird sowohl für die Entwicklungsphase der Kundensoftware wie auch für die produktive Nutzung verwendet.
5.1.2. URL Test-Umgebung
In speziellen Fällen werden neue Funktionen und Testmöglichkeiten über ein Testsystem bereitgestellt. Für diesen Fall werden die API-Kunden gesondert informiert. Das Testsystem ist nicht durchgängig parallel zum Live System verfügbar. Das Testsytem muss nicht dem Bestand des Live-Systems entsprechen und kann sich ändern.
Basis URL Testsystem (per HTTPS): https://test-api.vlb.de/ 5.2. Rückgabeformate
Über den HTTP Header Content-Type kann angegeben werden, in welchem Format die Übergabe der Parameter erfolgt, mit dem Parameter Accept muß das Rückgabeformat definiert werden. Welche Formate ein Endpoint unterstützt, wird bei der Beschreibung des Endpoints angegeben.
Rückgabeformate:
- application/json-short – Wird für die Rückgabe des “JSON-short” Formats
verwendet (nur Trefferliste)
VLB-REST-API Spezifikation 13 / 85
   
 - application/json – Wird für die Rückgabe des „JSON-long“ Formats (Trefferliste und Detail) verwendet.
- application/onix21-short – Liefert ONIX21 im Short-Format zurück (nur Detail)
- application/onix21-ref – Liefert ONIX21 im Reference-Format zurück (nur
Detail)
- application/onix30-short – Liefert ONIX3.1 im Short-Format zurück (nur Detail)
- application/onix30-ref – Liefert ONIX3.1 im Reference-Format zurück (nur
Detail)
5.3. Feldinhalte in der Rückgabe
Felder, die keine Werte enthalten werden nicht ausgegeben. Damit ändert sich der Umfang der Rückgabe abhängig vom Inhalt des Datensatzes. Im Gegensatz dazu hat die vorhergehnede Schnittstellenversion v1 NULL-Werte ausgegeben für den Fall dass keine Daten vorhanden waren.
5.4. Fehler
5.4.1. Fehlercodes
Die API meldet Fehler als http-Statuscode zurück.:
- 400 Bad Request: Anfrage-Nachricht war fehlerhaft aufgebaut.
- 401 Unauthorized: Kann nicht ohne gültige Authentifizierung durchgeführt
werden
- 403
- 404
- 500
Forbidden: Anfrage in gegebener Form nicht erlaubt.
Not Found: Die Ressource konnte nicht gefunden werden Internal Server Error: Bei allgemeinen Statusfehlern
Werden archivierte Titel ohne Zugangsberechtigung für archivierte Titel aufgerufen, so erscheint die Meldung „401 – Unauthorized“ da der Token keine Berechtigung zum Abruf archivierter Daten hat.
5.4.2. JSON-Fehlercodes
Zusätzlich zu den HTTP-Fehlercodes werden im Response Body noch weitere Fehlerinformationen im JSON Format ausgegeben. Der Aufbau dieser Nachrichten ist wie folgt:
Mögliche Fehlercodes sind:
• invalid_token: Der übergebene Zugangstoken ist ungültig
• product_blocked: Das angeforderte Produkt ist nicht zur Anzeige freigegeben VLB-REST-API Spezifikation 14 / 85
 {
"error": "<error_code>", "error_description": "<error_description>"
}

 • no_permission: Diese Anfrage darf mit dem Berechtigungslevel des gegebenen Tokens nicht ausgeführt werden
• not_found: Produkt nicht vorhanden
• unauthorized:
• access_denied:
Siehe zu den Fehlermeldungen auch das Kapitel 6.3 Rückmeldungen der API.
5.4.3. Einschränkungen bei der Abfrage (Deep paging Sperre)
Für den Abruf von Artikeldaten über die REST-API Trefferliste ist ein Limit von 10.000 Produkten festgelegt um ein Deep-paging einzuschränken.
D.h. es können Artikelangaben in der Trefferliste bis zum 10.000 Artikel abgerufen werden. Der Abruf des 10.001 Artikels über die Trefferliste wird mit einem http- Fehlercode 400 beantwortet. Z.B. ist der Abruf der Seite 40 der Trefferliste bei einer Anzahl von max. 250 Artikeln pro Seite noch möglich. Der Abruf der Seite 41 mit ebenfalls 250 Artikeln wird blockiert da die Artikelanzahl in diesem Fall bei 10.001 beginnen würde (siehe 6.3.2.1 Rückmeldungen beim Aufruf der Suche).
Die Abfrage ist in diesem Fall entsprecehnd anzupasssen, so dass die gewünschten Artikel in der Treffermenge bis 10.000 Artiklen liegen.
Der Abruf von 10.000 und mehr Artikeln über den Detailaufruf ist von dieser Einschränkung nicht betroffen, da der Detailaufruf pro Artikel erfolgt.
Ebenso ist die Ermittlung einer Treffermenge die über 10.000 Artikeln liegt bzw. liegen könnte weiterhin möglich.
5.5. Anmeldung an der API
Aufgrund der REST-Technologie und des OAUTH2-Verfahrens arbeitet die API zur Authentifizierung mit einem Access-Token. Das Access-Token ist in jeder Anfrage an die API zu mitzusenden.
5.5.1. Access-Token zur API-Anmeldung
Je nach Anwendungsfall wird zwischen einer statusgebundenen Anmeldung für Einzelplatzanwendungen und einer statuslosen Anmeldung für Webshop- Anwendungen unterschieden und die entsprechenden Tokens bereitgestellt bzw. generiert.
Token je Nutzergruppe
Je nach Nutzergruppe und gesetzten Zugriffsrechten berechtigt der Token zum Abruf von
• Metadaten und Medienobjekten inkl. Cover
VLB-REST-API Spezifikation 15 / 85
 
 • Nur Medienobjekte inkl. Cover
• Ausschließlich Cover
• Ausschließlich Metadaten
• Adressdaten
Token für die statusgebundene Anmeldung
Im Fall der Einzelplatzanwendung wird über das Login der benötigte Access-Token generiert. Das Token ist nur für dieses individuelle Login dieser Applikation gültig.
Eine Login-Passwort-Kombination lässt eine bestimmte Anzahl paralleler Anmeldungen (= Generierung von Access-Token) zu. Ist die maximale Anzahl erreicht, muss zuerst ein Access-Token „zurückgegeben“ (=freigegeben) werden, bevor ein neues Token generiert werden kann. Die Anzahl parallel möglicher API- Logins für diesen User/Account wird über den MVB-Kundenservice festgelegt.
Für den Anwendungsfall der Einzelplatzanwendung hat die API ein definiertes Timeout von 60 Minuten bei Inaktivität, der Token wird dann auf Status „ungültig“ gesetzt. In den ersten 10 Minuten der Tokengültigkeit löst die Verwendung der API noch keine Verlängerung des Token aus.
Token für die statuslose Anmeldung
Im Fall der Webshop-Anwendung bzw. einer Anwendung mit einer unbestimmten Anzahl von Datennutzern wird ein Access-Token bereitgestellt, das eine unbegrenzte Anzahl von parallelen Anwendungen zulässt. Es ist kein vorheriges Login notwendig. Der Zugriff auf Medienobjekte kann je nach geschalteter Berechtigung (Abrechnung im Kunden-Account) eingeschränkt sein. Die Bereitstellung des Token erfolgt über den MVB-Kundenservice. Adressdaten müssen über eine von den Artikelmetadaten getrennte Funktion abgerufen werden.
5.5.2. Authentifizierung
Bei allen Requests, mit Ausnahme des Login, wird der Zugang über den Access- Token authentifiziert, der auf zwei Wegen übergeben werden kann:
1. HTTP Authorization Header mit Wert “Bearer“ gefolgt vom Access-Token:
https://api.vlb.de/api/v2/product/29ef901373fb48bea8865948c75af64f
    VLB-REST-API Spezifikation 16 / 85

 2. URL Parameter access_token:
https://api.vlb.de/api/v2/logout?access_token=<YOUR_ACCESS_TOKEN>
Bei nicht erfolgreicher Authentifizierung wird ein http-Statuscode 401 im JSON- Format zurückgegeben:
5.5.3. Statusgebundene Anmeldung mit Login
Login
Das Login wird für den Einsatz in z.B. Warenwirtschaftssystemen oder Einzelplatz- Recherche-Systemen benötigt. Der Anwender benötigt eine Login-Passwort- Kombination für die Anmeldung an der API. Nach erfolgreichem Login generiert das System einen Access-Token.
Login Request
Der User wird eingeloggt und erhält einen gültigen Access-Token.
URL: Die Loginfunktionalität, mit dem die API das Access-Token generiert, wird über folgende URL/Funktion aufgerufen:
Live: https://api.vlb.de/api/v2/login Protokoll:
HTTPS
Method:
POST
Authentifizierung erforderlich: Nein
Request Parameter:
Keine
Request Payload:
JSON mit den Attributen:
• username: your username
• password: your password
Beispiel:
Rückgabe:
   {
"error": "invalid_token",
"error_description": "Invalid access token: <YOUR_ACCESS_TOKEN>"
 }
   {
    "username": "your username",
    "password": "your password"
}
VLB-REST-API Spezifikation
17 / 85

 HTTP-StatusCode: 200 Format: String Content: accessToken
Logout
Der mit dem Request übergebene Access-Token wird vom System abgemeldet. Siehe auch Punkt 5.5.2 Authentifizierung.
URL:
https://api.vlb.de/api/v2/logout
Protokoll:
HTTPS
Authentifizierung erforderlich:
Ja
Request Parameter
Keine
Rückgabe
HTTP-StatusCode: 200 Format: Kein
Content: Nein
5.5.4. Abfrage von Medienobjekten
Für den Abruf der Cover/ Mediendateien-Daten ist aus Sicherheitsgründen ein eigenes Access-Token notwendig, das entsprechend dem oben beschriebenen Weg erzeugt werden muss, s. Kapitel 5.5.1.3 Token für die statuslose Anmeldung.
5.5.5. Hinweise für den Einsatz eines Access-Token
Das Token erlaubt den Zugriff auf das VLB-System ohne weitere Authentifizierungen, wobei die Token für die Cover bzw. Medienobjekte nicht für den Abruf von Metadaten zu verwenden sind. Es ist darauf zu achten, dass der Access-Token nicht kopiert oder durch Dritte eingesehen werden kann, z.B. mit Hilfe eines Proxys.
5.5.6. Beschreibung
Die VLB-API bietet verschiedene Suchmöglichkeiten, die auch auf VLB-Online (www.vlb.de ) angeboten werden:
- Schnellsuche
- Boolesche Suche
- Stapelsuche
- Indexsuche (s. Kapitel 5.11 Indexsuche)
  VLB-REST-API Spezifikation
18 / 85

 Stoppworte sind für die Suche grundsätzlich ausgeschlossen, z.B. a, al, das, dem, den, der, die, ein, eine, einem, einen, einer, eines, el, l, la, le, les, lo, the, un, una, une, uno.
5.6. Suche
5.6.1. Schnellsuche
Die Schnellsuche umfasst folgende Felder:
• Schlagworte (vom Verlag vergebene Schlagworte, DNB-Schlagworte)Titel- und Untertitel
• Reihen- und Hierarchie-Titel
• Autor
• Verlag
• Identifier (ISBN, GTIN, ÖSB-Nummer, VLB-Bestellnummer, etc.)
• Thema-Subject
• Warengruppenindex-Bezeichnung
• Warengruppen Codename (z.B. Erzählende Literatur)
• ZIS-Sachgruppenname (z.B. Chemische Industrie, Kunststoffe)
• ReihenkürzelX-Nummer für Hierarchien
5.6.2. Boolesche Suche
Die Boolesche Suche nutzt die aus dem VLB bekannten booleschen Parameter, siehe dazu auch die Online Hilfe des VLB – Abschnitt „Boolesche Suche“.
   Key
   Durchsuchte Felder im Index
   Anmerkung
 ST Felder der Schnellsuche 5.6.1 AU contributors
TI     title
VL publisher
publisherId
PR     currentPriceDe
Stichwort Autor, Urheber
Titel
Verlag sowie
Verlags-ID (publisherMvbId, mvbId,
      SW
  keywords
    Schlagwort; durchsucht vom Verlag vergebene Schlagworte sowie DNB- Schlagworte
     IS
  isbn
gtin
oesbnr bestellnummer
    Alle möglichen Identifier (Es ist nur die VLB- Bestellnummer suchbar, keine Auslieferungs- oder Barsortimentsnummer)
 Preis
 VLB-REST-API Spezifikation
19 / 85

   Key
   Durchsuchte Felder im Index
   Anmerkung
 EJ     publicationDate
SP     language
AD lastModificationDate
ZD creationDate
Erscheinungsjahr
Sprache
Letztes Änderungsdatum; Eingabe: yyyymmdd Zugangsdatum; Eingabe: yyyymmdd
  WG
 genreCode
    Warengruppennummer: mit WarengruppenIndex vorangestellt; Trunkierung ist möglich (siehe 5.6.2.2 Besondere Hinweise zur Booleschen Suche:)
        TH
  THEMA_MAIN_SUBJECT, THEMA_MAIN_SUBJECT_NAME, THEMA_SUBJECT, THEMA_SUBJECT_NAME, THEMA_QUALIFIER, THEMA_QUALIFIER_NAME,
    Thema-Codes: hier ist sowohl die Suche nach Subjects und Qualifier sowie die Trunkierung möglich (z.B. TH=A findet alle Titel,die mit „A“ klassifiziert werden; TH=A* findet alle Titel die eine Thema-Klassifikation beginnend mit A haben, also AB, AF, AG; AFC, AFH etc.; genauso wird mit den Qualifier verfahren)
 TM THEMA_MAIN_SUBJECT, THEMA_MAIN_SUBJECT_NAME
TS THEMA_SUBJECT, THEMA_SUBJECT_NAME
TQ THEMA_QUALIFIER, THEMA_QUALIFIER_NAME
Thema-Haupt-Inhalte (Subjects) Thema-Inhalte (Subjects)
Thema-Zusätze (Qualifier)
         PF
  productForm
    Produktform (ONIX-Codes); Trunkierung ist möglich (PF=E* gibt alle digitalen Produkte)
Bitte beachten Sie, dass mit Onix 3.1 weitere Produktform-Codes gültig werden.
ONIX-Codes – Liste 150; Trunkierung möglich
eine Kombination der Onix 2.1 Produkformen (PF) mit den Onix 3.1 Produktformdetails (PD) ist nicht möglich bzw. sollte nicht verwendet werden.
 VLB-REST-API Spezifikation
20 / 85

   Key
   Durchsuchte Felder im Index
   Anmerkung
 PD productFormDetail
ONIX-Codes – Liste 175; Trunkierung möglich
   PT
 productType
   Mit Hilfe diese Booleschen Parameter lassen sich im speziellen Bundle Produkte mit MWST-Splitting selektieren. Der Parameter ist case-sensitive:
a.: duo-Bundles PT=duoBundle
b.:alle MWST splitting Bundles PT=*Bundle
siehe auch 9.4.1 productType Werte
   RH
  Reihen-/Hierarchie-Titel, Reihen- /Hierarchie-identifier
    Der Schlüssel deckt die Reihen wie Hierarchie-Suche ab. Die Unterscheidung zwischen Reihe und Hierarchie-Identifier erfolgt durch das erste Zeichen:
 LI Lieferbarkeit UG
UI
UO
LH Hauptlesemotiv LN Nebenlesemotiv
Lieferbarkeitsangabe des Verlages aus j396 Urheber-GND (keine Wildcard-Suche) Urheber-ISNI (keine Wildcard-Suche) Urheber-ORCID (keine Wildcard-Suche)
ONIX 3.1 Codeliste 27 , Code B8 (siehe 5.6.2.3)
ONIX 3.1 Codeliste 27, Code B8 (siehe 5.6.2.3)
                  Die Angabe der Kategorie ist in beliebiger Kombination von Groß-/Kleinschreibung erlaubt, ein Gleichheitszeichen muss ohne Leerzeichen direkt anschließen.
Es ist möglich, die Kategorie-Angabe wegzulassen (bei der ersten Kategorie); dann wird automatisch ST ausgewählt.
Gegenüber der vorhergenden Schnittstellenversion v1 ist der Parameter PD (Produktformdetail) und LI (Lieferbarkeit) hinzugekommen sowie der Parameter PF (Produktform) der die Produktformwerte der ONIX 3.1 Produktform durchsucht.
VLB-REST-API Spezifikation 21 / 85

 Suchsyntax und Boolesche Operatoren
Nach Angabe einer Kategorie sind ein oder mehrere Suchbegriffe, durch Leerzeichen getrennt, erlaubt. Wenn mehrere Suchbegriffe angegeben werden, so werden diese standardmäßig mit UND verknüpft (im selben Feld der Kategorie, aber nicht notwendig in derselben Zeile, falls ein Feld mehrere Werte haben kann).
Bsp.: au=Karl May findet alle Werke, deren Autoren, Herausgeber etc. in Gesamtheit ein „Karl“ und ein „May“ enthalten; natürlich auch die von Karl May selbst.
Diakritische Zeichen (Akzente etc.) müssen nicht eingegeben werden; sie werden automatisch normalisiert. Groß- und Kleinschreibung wird ebenso nicht beachtet. Umlaute werden gleichgesetzt mit ihrem mehrbuchstabigen Äquivalent (ü <-> ue, ß <-> ss etc.).
Wenn der Suchtext in Anführungszeichen gesetzt wird, so wird er in exakt dieser Reihenfolge gesucht (Phrase).
Bsp.: au=“May, Karl“ findet exakt alle Werke von Karl May, da Namen in dieser Form abgespeichert werden.
Werden mehrere Kategorien angegeben (durch Leerzeichen getrennt), so werden diese automatisch mit UND verbunden.
Bsp.: ti=gymnastik pf=BC sp=ger findet alle Taschenbücher mit „gymnastik“ im Titel in deutscher Sprache
Alternativ lassen sich Kategorien auch explizit mit UND/ODER verbinden; auch geklammert, falls notwendig.
Bsp.:
• ti=gymnastik oder ti=turnen findet alle Werke mit „gymnastik“ oder „turnen“ im Titel
• au=rowling und (pf=AJ oder pf=EA) findet alle Werke mit „rowling“ als Beitragende, die entweder downloadbares Audiofile oder E-Book sind.
• st=Wasser und (PF=not EA oder PF=BA)
Operatoren innerhalb einer Begriffskette sind nicht zulässig. Z.B. führt „ti=gymnastik oder turnen“ nicht zum intendierten Ergebnis, sondern muss wie im obigen Beispiel mit mehrfacher Nennung der Kategorie umgesetzt werden.
Ein Begriff kann explizit von der Suche ausgeschlossen werden, indem das Wort NICHT davor gesetzt wird. Dann werden alle Werke gesucht, die den entsprechenden Begriff nicht enthalten.
 VLB-REST-API Spezifikation 22 / 85

 Bsp.: ti= nicht fisch nicht fleisch findet alle Werke, deren Titel weder den Begriff „fisch“ noch den Begriff „fleisch“ enthalten.
Es sind für die Booleschen Operatoren nur UND / AND, ODER / OR bzw. NICHT / NOT als Boolesche Operatoren erlaubt. Die entsprechenden Zeichen (&, | , -) sind nicht verwendbar. Für die Suche nach Begriffen oder Phrasen, die einen oder mehrere der Operatoren enthalten, müssen diese in Anführungszeichen (ASCII 22) gesetzt werden, um nicht als Operatoren interpretiert zu werden.
Bsp.: ti=“nicht fisch nicht fleisch“ findet genau die Werke, in deren Titel „nicht fisch nicht fleisch“ vorkommt.
Um Zeiträume zu durchsuchen, wird das Caret-Zeichen (^) verwendet. Ein Beispielhafter Aufruf wäre search=AD=20150319^20150321, wobei das Startdatum inklusive und das Enddatum inklusive ist. Bitte hierbei immer das URL encoding beachten (z.B. für das Beispiel hier: AD%3D20150319%5E20150321)
Datumskategorien können nach dem ONIX-Datumsformat (YYYYMMDD) das 4- (YYYY), 6- (YYYYMM) oder 8-stellig sein darf. Alternativ kann das Deutsche Datumsformat verwendet werden (DD.MM.YYYY). Das deutsche Datumsformat kann nur 8-stellig (vollständig) verwendet werden. Eine Suche mit Wildcard ist bei dem deutschen Datumsformat nicht möglich. Das ONIX-Datumsformat lässt eine Wildcard-Suche nur nach 4 oder 6 Zeichen zu.
Besondere Hinweise zur Booleschen Suche:
Bei der Suche mit Hilfe von Booleschen Parameter sind für bestimmte Felder besondere Hinweise zu beachten.
• Warengruppen-Suche
• Suche nach dem Warengruppen-Index: WG=1*
(hier die Suche nach Hard / Soft-Cover Titeln – WG-Index 1)
• Suche nach der Warengruppe: WG=*250
(hier die Suche nach der Warengruppe 250 - Kinderbücher bis 11 Jahre)
• Thema-Suche:
• th=la* findet auch das „la“ im thema-Text von z.B. Regional- Landes- und
Lokalpolitik
• Sonderzeichen
VLB-REST-API Spezifikation 23 / 85
 
 • Werden Anführungszeichen für die Suche verwendet, so ist das Zeichen mit dem ASCII Code 22 zu verwenden z.B. "Hallo Welt"
• Produktform und Produktformdetail
• Seit der Einführung von Onix 3 ist auch die Verwendung der ONIX 3
Produktform-Codes möglich. D.h. Die Suche nach E-Book Titeln ist über PD=E101 bzw. die Suche nach der Klasse der elektronischen Produkte ist über z.B. PF=EA möglich.
• Eine Kombination der Produktform-Codes aus ONIX 2.1 und ONIX 3.1 ist nicht möglich, also PF=DG und PD=E101.
• Suchoperatoren
• Die Verwendung des „?“ als Platzhlater in der Suche ist nicht möglich
Lesemotive in der booleschen Suche
Die Lesemotive können wie andere Klassifikationen auch über die Boolesche Suche als Suchfilter verwendet werden. (siehe die Tabelle der booleschen Suchparameter zu Beginn des Kapitels 5.6.2 Boolesche Suche sowei die ONIX Definition 9.5.23 subjects - Produktklassifikation).
Suchparameter:
LH Hauptlesemotiv LN Nebenlesemotiv
Jeder Titel erhält automatisch ein Haupt-Lesemotiv, gegebenenfalls wird zusätzlich ein Neben-Lesemotiv erstellt (ausgenommen sind Kinderbücher bis elf Jahren sowie Geschenkbücher).
Die Lesemotive sind nur im Titeldetailabruf der Version 2 der REST-API verfügbar, die Daten in der Version 1 der REST-API enthalten keine Lesemotive. Über die Trefferliste werden keine Lesemotivangaben ausgegeben, weder in der Version 2 noch der Version 1 der API .
Sollen die Lesemotive eines einzelnen Verlages oder einer Verlagsgruppe abgefragt werden nutzen Sie bitte die jeweils die einzelne Verlags-ID (keine oder Verknüpfung der Verlags-IDs einer Verlagsgruppe) zusammen mit den Lesemotiven.
Die einzelnen aktuellen Begriffe und ihre Erläuterung finden Sie auf der VLB Hilfe Seite unter:
https://vlb.de/hilfe/lesemotive
  VLB-REST-API Spezifikation 24 / 85

 5.6.3. Stapelsuche
An die Stapelsuche-Funktion kann eine Liste von bis zu 500 ISBN übermittelt werden. Die Stapelsuche kann mit Booleschen Parametern kombiniert werden.
Für die Stapelsuche ist ein HTTP POST zu verwenden. ISBNs können dann im Payload angegeben werden und werden wie folgt erwartet:
5.6.4. Request
URL:
https://api.vlb.de/api/v2/products?page%3D<pageno>%26size%3D<size>%26[sort% 3D<column>%26direction%3D<direction>][%26search%3D<value>][%26active%3D< active>][&26source%3D<source>]
Protokoll:
HTTPS
Method:
POST
Authentifizierung erforderlich:
Ja
Request Parameter:
 {
    "content": [
{
             "isbn": <value>,
        },
        {
            "isbn": <value>,
}, ]
}
   page: size:
sort (optional):
• identifier • author
Die Seitenzahl der Seite die ausgegeben werden soll (beginnt mit 1)
Die Anzahl der Produkte, die maximal pro Seite ausgegeben werden sollen. Die maximale Anzahl ist hier auf 250 Produkte begrenzt.
Die Ausgabespalte, nach der das Suchergebnis sortiert werden soll. Default Sortierung (keine Angabe des „sort“ Parameters) ist nach Score descending (Wertigkeit des Titels zur Anfrage). Mögliche Spalten sind:
VLB-REST-API Spezifikation 25 / 85

 • titleAndSubtitle
• publisher
• publisherMvbId
• publicationDate
• productAvailability • price
• creationDate
• lastModificationDate • productType
• active
direction (optional): In aufsteigender oder absteigender Reihenfolge sortieren. Mögliche Werte sind asc (aufsteigend) und desc (absteigend)
search (optional): Eine (boolesche) Suchphrase (URL encodiert siehe 7. Encodings). Wenn nicht angegeben wird nach allen verfügbaren
Produkten gesucht. Felder können explizit über boolsche Parameter durchsucht werden. Wenn die Suchphrase keine einschränkenden Suchfelder enthält, so wird in den Schnellsuche-Feldern gesucht.
active (optional): Aktive (true) und/oder inaktive (false) Titel (ohne Angabe: aktive und inaktive Titel)
source (optional): Definiert den Aggregator der Daten, die geliefert werden sollen. Kann beliebig verknüpft werden. Siehe dazu
Kapitel 5.13 Übersicht der Aggregatoren JSON mit den Attributen:
• ISBN
Rückgabe - Trefferliste
HTTP-StatusCode: 200 Format: JSON (short oder long) Content:
content: Die Produkte des Suchergebnisses (Basisdaten). Im Folgenden die wichtigsten Felder im Überblick:
productId: Die (interne) eindeutige ID des Produktes
Request Payload:
 VLB-REST-API Spezifikation 26 / 85

 version: identifier:
sort:
direction:
property:
ascending: totalPages:
Die Versionsnummer des Produktes (für interne Zwecke)
Der Hauptidentifier des Produktes (i.d.R. die ISBN13). Er kann je Selektion mehrfach vorkommen. Pro Aggregator ist der Hauptidentifier eindeutig.
Informationen zur Sortierung der Ergebnisliste Aufsteigend (asc) oder absteigend (desc)
Die Ergebnisspalte, nach der sortiert wurde )
true, wenn direction = „asc“, ansonsten false
Die Anzahl der Seiten im Suchergebnis
true, wenn diese Seite die letzte Seite des Suchergebnisses ist
lastPage:
numberOfElements: Anzahl der Ergebnisse, die auf dieser Seite angezeigt werden
totalElements: firstPage: size:
number:
Anzahl der Ergebnisse insgesamt
true, wenn diese Seite die erste Seite des Suchergebnisses ist
Die maximal angeforderte Anzahl Produkte
Die aktuelle Seitenzahl. Beginnt bei 0 – entspricht also dem Suchparameter page - 1
VLB-REST-API Spezifikation 27 / 85

 JSON-short Rückgabe:
{
    "content": [
{
"productId": "1f53c4e19dda4d4499718a75f81f8577",
"isbn": "978-3-7657-6000-6",
"gtin": "9783765760006",
"bestellnummer": "1876160",
"author": "Körperschaft ist Autor; Brown, Dan",
"title": " Hierarchietitel / Hierarchietitel / (Haupt-)Titel", "subTitle": "Hierarchienuntertitel / Untertitel",
"publisher": "Reclam, Philipp",
"publisherMvbId": "5108746",
  "publicationDate": "10.10.2021",
"edition": "Auflagentext: 2. erweiterte und kommentierte Auflage, 3. Version", "productType": "duoBundle",
"priceEurD": 22.6,
"collections": [
{
"setId": "X-3527-6306-X",
"title": "Hierarchietitel", "subtitle": "Hierarchienuntertitel",
"partNumber": 2
  } ],
}, {
} ],
"collectionId": "AADUN86", "title": "Reihentitel", "subtitle": "Reihenuntertitel", " partNumber": 5
"announcementDate": "03.09.2020", "productForm": "SA", "primaryContentType": "10", "productFormDetail": [
    "B131",
    "E200",
    "B105",
    "V221"
],
"priceProvisionalEurD": false, "priceCalculatedEurD": false, "priceFixedEurD": true,
"active": true, "productAvailability": "10", "creationDate": "28.06.2018", "lastModificationDate": "28.06.2018"
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "firstPage": true,
    "lastPage": true,
    "numberOfElements": 1,
    "sort": [
        {
            "direction": "ASC",
            "property": "identifier",
            "ignoreCase": false,
            "ascending": true
} ],
    "first": true,
    "size": 250,
    "number": 0
}
 VLB-REST-API Spezifikation 28 / 85

 5.7. Liste von Produkteinträgen abrufen
Mit Hilfe der Funktion zum Abruf einer Liste von vollen Produkteinträgen lassen sich die Detailinformationen verschiedener Produkte vereinfacht abrufen.
Zum Abruf der Daten ist die UUID der abzufragenden Produkte anzugeben. Die Liste der Produkteinträge in der Antwort entspricht der Reihenfolge der angefragten UUIDs.
Für den Stapelabruf ist ein HTTP POST zu verwenden. UUIDs können dann im Payload angegeben werden und werden wie folgt erwartet:
5.7.1. Request
URL:
https://api.vlb.de/api/v2/product/multipleProducts
Protokoll:
HTTPS
Method:
POST
Authentifizierung erforderlich:
Ja
Request Parameter:
Keine
Request Payload:
JSON mit den Attributen: Product-ID
5.7.2. Rückgabe - Liste Produkteinträge
HTTP-StatusCode: 200 Format: String Content:
Im Folgenden wird hier lediglich auf die wichtigsten Parameter eingegangen:
 {
"ids": [
       <value>,
       <value>,
] }
 VLB-REST-API Spezifikation
29 / 85

 productId: Die unique id eines Datensatzes. Jede Unterentität stellt eine id bereit. Diese ist ein 32 Stellen langer Hashwert.
version: Die Version, in der ein Datensatz vorliegt. Die Versionsnummer wird bei jeder Änderung inkrementiert.
composites: Als „composites“ werden hier die einzelnen Blöcke (audiences, contributors, etc.) bezeichnet. Diese richten sich in der Regel nach dem ONIX-Aufbau und enthalten sprechende Parameter.
Die Rückgabe wird in einem Format angeboten – JSON. Eine Rückgabe in JSON- short bzw. ONIX ist hier nicht möglich.
5.8. Produkteintrag abrufen
Über die 32-stellige Produkt-ID kann der Produkteintrag im Detail aufgerufen werden, sofern die Angaben aus der Trefferliste nicht ausreichend sind. Grundsätzlich stehen drei Ausgabeformate (JSON-long und ONIX) zur Verfügung.
5.8.1. Rückgabe - Produkteintrag
HTTP-StatusCode: 200 Format: String Content:
Im Folgenden wird hier lediglich auf die wichtigsten Parameter eingegangen:
productId: die unique id eines Datensatzes. Jede Unterentität stellt eine id bereit. Diese ist ein 32 Stellen langer Hashwert.
version: Die Version, in der ein Datensatz vorliegt. Die Versionsnummer wird bei jeder Änderung inkrementiert.
composites: Als „composites“ werden hier die einzelnen Blöcke (audiences, contributors, etc.) bezeichnet. Diese richten sich in der Regel nach dem ONIX-Aufbau und enthalten sprechende Parameter.
Die Rückgabe für den Einzel-Produktabruf wird in zwei verschiedenen Formaten angeboten – JSON und ONIX. Für die Rückgabe im JSON Format stehen zwei Ausgabeprofile zur Verfügung.
Im ONIX Format stehen nur Daten aus dem VLB zur Verfügung, Daten anderer Aggregatoren können nicht im ONIX Format abgerufen werden.
VLB-REST-API Spezifikation 30 / 85

 JSON-long
Das JSON-long Format enthält alle Metadaten und alle Langtextfelder eines Produkts in voller Länge. Bezogen auf die Performance ist zu berücksichtigen, dass die Langtexte im VLB einen deutlich höheren Umfang (unbeschränkte Anzahl Zeichen) haben können.
Der Block „publisherData“ steht für statuslose Token (5.5.1.3 Token für die statuslose Anmeldung) nicht zur Verfügung
ONIX3 short
Für die genauen Rückgabeparameter im ONIX 3.1 Format konsultieren Sie bitte die entsprechende ONIX Spezifikation.
   <?xml version="1.0" encoding="UTF-8" standalone="no"?> <ONIXmessage release="3.1">
    <header>
        <sender>
<x298>VLB - Staging</x298>
<x299>MVB Marketing- und Verlagsservice des Buchhandels GmbH, 069.1306.550</x299> <j272>serviceline@mvb-online.de</j272>
</sender>
        <x307>20180709</x307>
    </header>
<product datestamp="20180706"> <a001>392484a6cc2d4db4a165ec94baac234c</a001> <a002>03</a002>
<productidentifier>
            <b221>02</b221>
....
</OnixMessage>
ONIX3 ref
Für die genauen Rückgabeparameter im ONIX 3.1 Reference Format konsultieren Sie bitte die entsprechende ONIX Spezifikation.
  <?xml version="1.0" encoding="UTF-8" standalone="no"?> <ONIXMessage release="3.1">
    <Header>
        <Sender>
<SenderName>VLB - Staging</SenderName>
<ContactName>MVB Marketing- und Verlagsservice des Buchhandels GmbH, 069.1306.550</ContactName>
<EmailAddress>serviceline@mvb-online.de</EmailAddress> </Sender>
<SentDateTime>20180709</SentDateTime> </Header>
<Product datestamp="20180706"> <RecordReference>acf1e447f5c1489b9b65fae5ee5a4fa7</RecordReference> <NotificationType>03</NotificationType>
<ProductIdentifier>
<ProductIDType>02</ProductIDType>
....
</OnixMessage>
VLB-REST-API Spezifikation 31 / 85

 5.8.2. Request
URL:
https://api.vlb.de/api/v2/product/<id>[/<id-type>]
Protokoll:
HTTPS
Authentifizierung erforderlich:
Ja
Request Parameter
 id:
id-type (optional):
• gtin
• isbn13 • ean
5.8.3. Beispiel – Produkteintrag abrufen
Ein Produkt wird im JSON-long Format über die ID aufgerufen:
https://api.vlb.de/api/v2/product/79b7ee6ef4e74f4f9cbb242a6e30e537 oder
Ein Produkt wird im JSON-long Format über ISBN (id-type) aufgerufen: https://api.vlb.de/api/v2/product/9783123456789/isbn13
Ergebnis:
Sieheverlinkte ZIP-Datei in 6.4 Beispieldaten.
Die ID des Produktes, das angezeigt werden soll. Die ID wird in den Such-Ergebnissen im Feld id übergeben und kann daraus referenziert werden. Bzw. im Feld „identifier“ für den optionalen id-type
Der Typ der übergebenen ID. Wenn keiner angegeben, wird die unique id als Standard erwartet. Mögliche Werte sind:
  VLB-REST-API Spezifikation
32 / 85

 5.9. Mediendateien abrufen
5.9.1. Beschreibung
Die VLB-API bietet neben der Cover-URL auch die URLs zu den zu einem Artikel gehörenden Mediendateien. Darunter fällt die Verlinkung z.B. zu Backcover, Innansichten.
Der Endpunkt des Aufrufs gegenüber der vorehrigen Version der Schnitstelle (v1) ändert sich nicht, so dass der Medien- / Cover-Abruf über eine v1-URL wie auch eine v2-URL möglich ist. Beim Abruf der Mediendateien (dazu zählt auch das Cover) ist darauf zu achten, dass das Access-Token mit entsprechender Berechtigung verwendet werden muss und dieses nicht kopiert und von Dritten eingesehen werden kann. Daher ist mindestens eine Authentifizierungsmethode zu wählen, bei der das Token nicht direkt aus der Medien-Dateien-URL zu lesen ist. Die unterschiedlichen Methoden zur Authentifizierung sind in Kapitel 5.5.2 Authentifizierung genannt. Es können auch alternative Vorgehensweisen zum Aufruf der Medien-Dateien-URL eingesetzt werden (z.B. Proxy).
Mit dem Token zur Recherche und Abruf der Metadaten (explizites Metadaten- Token) ist kein Cover- oder Medien-Dateien-Aufruf möglich.
Tipps, wie Sie Mediendateien performant abrufen:
Die Mediendaten-Funktion der REST-API ist primär für den Abruf der zum einzelnen Produkt gehörenden Mediendateien gedacht und nicht zum Abruf größerer Cover- bzw. Mediendateien-Mengen wie z. B. Aufbau eines Mediendatenpools. Hierfür empfehlen wir Ihnen unsere Mediendatei-Feeds.
Laden Sie bitte nur aktualisierte Mediendateien herunter. Sie können dafür auf verschiedenen Wegen einen Identifier für die aktuellste Version der Mediendatei oder das letztes Aktualisierungsdatum abrufen:
Option a) Im HTTP-Header schickt das VLB für GET-Requests den sogenannten ETag (Entity-Tag) als Identifier und das letzte Aktualisierungsdatum im Feld Last- Modified mit, die beide zum HTTP-Standard gehören. Das VLB empfiehlt, einen GET-Request mit der Bedingung If-None-Match oder If-Modified-Since zu implementieren, da Sie mit lediglich einem HTTP-Standard-Request zeitsparend prüfen, ob die Datei bereits bei Ihnen im System vorliegt und diese ggf. sogleich herunterladen.
• If-None-Match: Diese Bedingung gleicht den gesendeten ETag-Wert mit dem ETag-Wert im VLB ab. Die angeforderte Mediendatei wird nur zurückgegeben, wenn die beiden Werte nicht übereinstimmen (Status 200). Wenn die beiden
   VLB-REST-API Spezifikation 33 / 85

 Werte übereinstimmen, Sie die Datei also bereits in der korrekten aktuellen
Version haben, dann gibt der Server 304 (Not Modified) zurück.
• If-Modified-Since: Ein Request mit dieser Bedingung gibt die angeforderte
Mediendatei nur zurück, wenn das Datum in Last-Modified nach dem angegebenen Datum liegt (Status 200), andernfalls ist der Response 304 (Not Modified) ohne Body, d.h. ohne Mediendatei
Option b) Außerdem unterstützt das VLB sogenannte HEAD-Requests und gibt im HTTP-Header wie bei GET-Requests den ETag (Entity-Tag) und das letzte Aktualisierungsdatum im Feld Last-Modified an. Falls Sie in Ihrem Datenbestand für eine Mediendatei bereits dasselbe Update-Datum oder denselben ETag-Wert haben, brauchen Sie die Datei nicht erneut mit einem GET-Request herunterladen, da sich an der Datei nichts verändert hat.
Option c) Falls Sie die Produktdaten für eine Prüfung heranziehen möchten, gibt es in den Produktdaten für jede Mediendatei ein letztes Aktualisierungsdatum im JSON- Feld lastUpdated und den MD5-Hash-Wert im Feld JSON-Feld md5Hash, die Sie mit den Werten in Ihrem Datenstand abgleichen können.
Benutzen Sie bitte Caching: Speichern Sie Mediendateien wie ein Cover nach einmaligem Download zwischen, damit das Cover nicht jedes Mal erneut über die REST-API abgerufen wird, wenn es z.B. nach einer Suchanfrage zur Anzeige in der Trefferliste benötigt wird.
 VLB-REST-API Spezifikation 34 / 85

 Folgende Mediendateien lassen sich über die VLB-REST-API aufrufen:
Dateityp Jpg, png: Je nachdem, ob der Verlag ein JPG- oder eine PNG-Datei für den Artikel bereitgestellt hat, wird auch ein JPG oder ein PNG über die REST-API ausgeliefert (gültig für alle Bild-Medientypen).
  Bezeichnung
   JSON-Type
   Medien-Typ
   Dateityp
 Cover
Backcover
Weitere Cover Innenansicht Inhaltsverzeichnis Beschreibung
Bild des Autors
Hörprobe
Leseprobe
Rezension
Vorwort
Register
Verlagslogo
Imprintlogo Autorenvorstellung (Text) Autorenvorstellung (Audio) Autoreninterview (Text) Autoreninterview (Audio) Autorenlesung
Bühnenbild
Feature
Pressemitteilung Werbematerial (Text) Werbematerial (Audio) Werbematerial (Bild)
FRONTCOVER BACKCOVER COVER_PACK IMAGE_SAMPLE_CONTENT TABLE_OF_CONTENT DESCRIPTION AUTHOR_IMAGE AUDIO_SAMPLE_CONTENT TEXT_SAMPLE_CONTENT REVIEW
INTRODUCTION
PRODUCT_INDEX
PUBLISHER_LOGO
IMPRINT_LOGO AUTHOR_PRESENTATION_TEXT AUTHOR_PRESENTATION_AUDIO AUTHOR_INTERVIEW_TEXT AUTHOR_INTERVIEW_AUDIO AUTHOR_READING
STAGE_IMAGE
FEATURE_ARTICLE
PRESS_RELEASE PROMOTIONAL_EVENT_MATERIAL_TEXT PROMOTIONAL_EVENT_MATERIAL_AUDIO PROMOTIONAL_EVENT_MATERIAL_IMAGE
Bild-Datei Bild-Datei Bild-Datei Bild-Datei PDF-Datei PDF-Datei Bild-Datei Audio-Datei
PDF- / Epub-Datei PDF-Datei PDF-Datei PDF-Datei Bild-Datei Bild-Datei PDF-Datei Audio-Datei PDF-Datei Audio-Datei Audio-Datei Bild-Datei PDF-Datei PDF-Datei PDF-Datei Audio-Datei Bild-Datei
Jpg, png Jpg. Png Jpg, png Jpg, png Pdf
Pdf
Jpg, png mp3, wave pdf, epub Pdf
Pdf
Pdf
Jpg, png Jpg, png Pdf
mp3, wave Pdf
mp3, wave mp3, wave Jpg, png Pdf
Pdf
Pdf
mp3, wave Jpg, png
                                                                                                    VLB-REST-API Spezifikation
35 / 85

   Bezeichnung
   JSON-Type
   Medien-Typ
   Dateityp
 Tutorial (Text)
Tutorial (Audio)
Tutorial (Bild) Marketinggrafik
Spiel- oder Bauanleitung Errata Reihenbeschreibung Reihenbild
Reihenlogo Bibliographie Vorschau Produktbild Produktlogo Wallpaper Umschlag Markenlogo
INSTRUCTIONAL_MATERIAL_TEXT INSTRUCTIONAL_MATERIAL_AUDIO INSTRUCTIONAL_MATERIAL_IMAGE ONLINE_ADVERTISEMENT_PANEL MANUAL
ERRATA COLLECTION_DESCRIPTION SERIES_IMAGE SERIES_LOGO BIBLIOGRAPHIC PUBLISHERS_CATALOGUE PRODUCT_ARTWORK PRODUCT_LOGO WALLPAPER
FULL_COVER MASTER_BRAND_LOGO
PDF-Datei     Pdf Audio-Datei     mp3, wave Bild-Datei     Jpg, png Bild-Datei     Jpg, png PDF-Datei     Pdf PDF-Datei     Pdf
PDF-Datei
Bild-Datei     Jpg, png Bild-Datei     Jpg, png PDF-Datei     Pdf PDF-Datei     Pdf Bild-Datei     Jpg, png Bild-Datei     Jpg, png Bild-Datei     Jpg, png Bild-Datei     Jpg, png Bild-Datei     Jpg, png
            Pdf
                      VLB-REST-API Spezifikation
36 / 85

 5.9.2. Request
URL:
https://api.vlb.de/api/v2/asset/mmo/<productId>
Protokoll:
HTTPS
Authentifizierung erforderlich:
Ja
Request Parameter
Product-id: Der Unique Identifier des Produktes, für das die Mediendateien-URLs abgerufen werden sollen
5.9.3. Rückgabe
HTTP-StatusCode: 200
Format: JSON
Header mit Last-Modified: letztes Aktualisierungsdatum, z.B. Thu, 07 Sep 2023 08:43:04 GMT
Header mit ETag: Identity-Tag, Identifier für die aktuellste Version der Mediendatei Content:
type: Der Typ der Medien-Dateie. Mögliche Typen sind in Tabelle Kapitel 5.9.1 Beschreibung aufgeführt, z. B. Cover, Backcover
url: Die eigentliche URL, unter der die Medien-Datei nach einer Authentifizierung heruntergeladen werden kann
5.9.4. Beispiel
Alle Medien-Dateien für ein Produkt sollen angezeigt werden.
Bsp für EPUB und Frontcover https://api.vlb.de/api/v2/asset/mmo/192a806ee0bf483da8fad6b7b8ec9308 bzw. Beispiel für weitere Medientypen https://api.vlb.de/api/v2/asset/mmo/518498f30da14eaab8d34364ee2610a8
  [
{
"type": "<type>",
        "url": "<url>",
       “sequenceNumber":"<number>"
} ]
   VLB-REST-API Spezifikation
37 / 85

 Ergebnis:
[
{
}, {
"url": "https://api.vlb.de/api/v2/asset/mmo/file/bfd3f377-4eaa-4b65-b830- 577918d776c8",
        "sequenceNumber": 1
    },
 "type": "FRONTCOVER",
"url": "https://api.vlb.de/api/v2/cover/9783150191064/m", "sequenceNumber": 1
"type": "TABLE_OF_CONTENT",
 {
"type": "TABLE_OF_CONTENT",
"url": "https://api.vlb.de/api/v2/asset/mmo/file/6adc9faa-9bb1-46c0-80f1-
01e6b0739ce9",
        "sequenceNumber": 2
}, {
"type": "PREVIEW_SAMPLE",
"url": "https://api.vlb.de/api/v2/asset/mmo/file/9c350d33-720d-477b-87ee-
ea07b39e2396",
5.10. Cover abrufen
5.10.1. Beschreibung
Das Cover eines Titels kann über den hier beschriebenen Coverlink in unterschiedlichen Größen aufgerufen werden. Zur Identifikation des Covers muss die ISBN/GTIN des Titels verwendet werden.
Der Endpunkt des Aufrufs gegenüber der vorehrigen Version der Schnitstelle (v1) ändert sich nicht, so dass der Medien- / Cover-Abruf über eine v1-URL wie auch eine v2-URL möglich ist.
Im Gegensatz zu dieser Funktion stellt die Trefferlisten-Rückgabe die Cover-URL nur für die M-Größe dar.
Beim Abruf der Cover-Objekte ist darauf zu achten, dass das Access-Token mit entsprechender Berechtigung verwendet wird und dieses nicht von außen eingesehen bzw. kopiert werden kann. Daher ist mindestens eine Authentifizierungsmethode zu wählen, bei der das Token nicht direkt aus der Cover- URL zu lesen ist. Die unterschiedlichen Methoden zur Authentifizierung sind in Kapitel 5.5.2 Authentifizierung genannt. Es können auch alternative Vorgehensweisen zum Aufruf der Cover-URL eingesetzt werden (z.B. Proxy).
          "sequenceNumber": 1
    },
{
"type": "PREVIEW_SAMPLE",
"url": "https://api.vlb.de/api/v2/asset/mmo/file/5e7d4ba7-b121-45ff-a85e-
f85a831459b5",
        "sequenceNumber": 2
} ]
VLB-REST-API Spezifikation 38 / 85

 Mit dem Token zur Recherche und Abruf der Metadaten ist kein Cover- oder Medien- Dateien-Aufruf möglich.
5.10.2. Cover-Request
URL:
https://api.vlb.de/api/v2/cover/<id>/[<size>]
Protokoll:
HTTPS
Authentifizierung erforderlich:
Ja
Request Parameter:
id: Die GTIN des Produktes bzw. für das das Cover abgerufen werden soll (ohne Bindestriche, also z.B. 9783411046508)
size (optional): Die Größe des Covers. Zurzeit können 3 Werte übergeben werden (Parameter ist case sensitive):
 • s (small)
• m (medium)
• l (large)
• ohne Parameter = Originalgröße
  Größe
   Aufrufparameter
   Breite
   Höhe
   Kommentar
 Small s
Medium m
Large l
(Original- größe) *
90 xyz 200 xyz abc 599 abc xyz
Höhe proportional zur Breite
Höhe proportional zur Breite
Breite proportional zur Höhe
Originalgröße des Covers im VLB
                    * Hinweis: Die Originalgröße bezieht sich nicht auf die Dateigröße sondern auf die Original-Pixelgröße. Cover in Originalgröße werden weboptimiert bereitgestellt.
5.10.3. Rückgabe
HTTP-StatusCode: 200
Format: image/jpeg
Header mit Last-Modified: letztes Aktualisierungsdatum, z.B. Thu, 07 Sep 2023
VLB-REST-API Spezifikation 39 / 85

 08:43:04 GMT
Header mit ETag: Identity-Tag, Identifier für die aktuellste Version der Mediendatei Content: Cover in binärer Form
5.11. Indexsuche
5.11.1. Beschreibung
Zur Unterstützung der Suche kann für bestimmte Felder ein Suchindex aufgerufen werden. Zu einem bestimmten Wort/Begriff werden die nächsten 100 folgenden Einträge gesucht und als Trefferliste ausgegeben.
Die Index-Suche ist für folgende Felder möglich:
• Autor
• Verlag
• Titel
• Schlagwort
• Reihe
• Hierarchie
• Identifier (ISBN / EAN, öster. Schulbuch, etc.)
Der Indexaufruf bietet keine „Blättern“-Funktion. Der Indexsuchbegriff muss daher entweder weiter eingeschränkt oder erweitert werden.
5.11.2. Request
URL:
https://api.vlb.de/api/v2/index/<field>/<search-term>
Protokoll:
HTTPS
Authentifizierung erforderlich:
Ja
Request Parameter
 field:
Das zu durchsuchende Feld. Kann eines der folgenden sein: • author
• publisher • title
• keyword • set
• collection VLB-REST-API Spezifikation
40 / 85

 • identifier (ISBN / EAN) search-term: Der eigentliche Suchbegriff
5.11.3. Rückgabe
HTTP-StatusCode: 200 Format: Json
Content:
content: value:
count:
{
5.11.4.
Enthält eine Liste aller Treffer
Der Wert des Ergebnisses
Die Häufigkeit des Auftretens des obigen Ergebniswerts
Beispiel
 [
          "value": <value>,
        "count": <value>
    }
]
Eine Suche nach dem Autoren „Meier“ wird durchgeführt.
https://api.vlb.de/api/v2/index/author/meier
Ergebnis:
  [
{
"value": "Meier",
"count": 5 },
{
    "value": "Meier, Achim",
    "count": 2
}, {
 ]
    "value": "Meier, Adolf",
"count": 1 }
5.12. Verlagsangaben abrufen
5.12.1. Beschreibung
Über diese Funktion können die Verlagsdaten im Detail abgerufen werden. Die Verlagsdaten stammen aus dem Adressbuch für den deutschsprachigen Buchhandel (ADB). Voraussetzung hierfür ist ein VLB-Abonnement.
Der Abruf der Verlagsdaten erfolgt über die Verlags-ID (Feld publisherMvbId aus der Trefferliste), die zu jedem Verlagsnamen in einem Titel geliefert wird.
 VLB-REST-API Spezifikation 41 / 85

 Bitte beachten Sie die geplanten Änderungen im Herbst 2024, die unter 5.12.2 Rückgabe und 5.12.3 Beispiel stehen.
5.12.1. Request
URL:
https://api.vlb.de/api/v2/publisher/<mvbid>
Protokoll:
HTTPS
Authentifizierung erforderlich:
Ja
Request Parameter
mvbid: Die ID des Verlages, für den Daten abgerufen werden sollen.
5.12.2. Rückgabe
HTTP-StatusCode: 200 Format: Json
Content:
Hier sind die wesentlichen Rückgabeparameter aufgelistet:
 mvbId: shortName: name: cityStreet: zipStreet: street: street2: country: postbox: zipPostalBox: phone:
fax:
email:
url: isbnPrefixes: deliveryBS: deliveryNote: bagCreditor: bagDebitor: tax:
Die MVB ID des Verlages (entspricht dem Request Parameter) Kurzbezeichnung für den Verlag
ungekürzter Verlagsname
Ortsname zur Straßenangabe
PLZ zur Straßenadresse Straßennamen
Adresszusatz
Land (zweistelliger ISO-Ländercode) Postfach des Verlags
PLZ zum Postfach des Verlags Telefonnummer
Faxnummer
Mailadresse
URL der Verlagsseite
Alle ISBN Präfixe, die diesem Verlag zugeordnet sind (als Block) Barsortimentsauslieferungsangaben
SOA Lieferhinweis
Abrechnung über die BAG (true/false)
Abrechnung über die BAG (true/false)
Die Umsatzsteuer ID des Verlages
VLB-REST-API Spezifikation
42 / 85

 siglDe:
siglAt:
siglCh: vnrKreditor: vnrKreditorAt: vnrKreditorCh: gln:
5.12.3.
Sigel Deutschland
Sigel Österreich
Sigel Schweiz
kreditorische Verkehrsnummer Deutschland kreditorische Verkehrsnummer Österreich kreditorische Verkehrsnummer Schweiz GLN (Globale Lokationsnummer)
Beispiel
Abruf der Verlagsdaten für Verlag mit der Verlags-ID 5106488:
https://api.vlb.de/api/v2/publisher/5106488
Ergebnis:
 {
"mvbId": "5106488",
"shortName": "MVB",
"name": "MVB GmbH",
"country": "DE",
"zipStreet": "60311",
"cityStreet": "Frankfurt am Main", "street": "Braubachstr. 16", "postbox": "10 04 42",
"zipPostalBox": "60004",
"phone": "+49 69 1306550",
"fax": "+49 69 1306255",
"email": "kundenservice@mvb-online.de", "url": "www.mvb-online.de", "isbnPrefixes": [
        "978-3-655",
        "978-3-89558",
        "978-3-9818608",
        "978-3-7657",
        "978-3-946404"
    ],
    "bagCreditor": false,
    "bagDebitor": false,
    "tax": "DE114130036",
    "vnrKreditor": "10871",
    "gln": "4030303000007"
  }
5.13. Übersicht der Aggregatoren
In der VLB-REST-API werden Datenquellen als Aggregatoren bezeichnet. Jeder Titel ist einem Aggregator zugewiesen.
  Aggregator
   Source-ID
(zur Selektion)
   Aggregatorid
(in der Rückmeldung)
   Titel
 VLB     vlb ÖSB oesb
ALL all
null 5001015
Eine ID pro Titel
Alle VLB-Titel ohne Aggregatoren Österreichische Schulbuchdaten (es gibt keine archivierten OESB Produkte) Alle möglichen Aggregatoren kombiniert
          VLB-REST-API Spezifikation
43 / 85

 Aggregatoren können durch mehrere Vorkommen des Source Parameters kombiniert werden (Bsp.: ...?source=vlb&source=oesb).
Bitte beachten: In der v2 der API werden keine null-Werte ausgegeben. Daher wird der Aggregator „VLB“ durch weglassen angezeigt.
Beispiele für Abfragen und Rückmeldungen 6.1. Übersicht der API Aufrufe
 Basis URL: https://api.vlb.de/api/v2/
Login POST login
Logout GET logout
Suche (Schnell- GET products?
und Boolesche)
Stapelsuche POST products?
Indexsuche index/
Einzelprodukt GET product/
Liste von POST product/multipleProducts Produkteinträgen
Verlagsangaben GET publisher/
Cover GET cover/
Medienobjekte GET asset/mmo/
Request Parameter, Suchanfrage Request Parameter Index-Typ, Wert Produkt-ID, ID-Typ
MVB-ID ISBN, Größe Produkt-ID
Username / Passwort
ISBNs Produkt-IDs
  Funktion
   Typ
   Funktionsaufruf
   Parameter
   Payload
                                                    Weitere Informationen siehe Kapitel 5 Aufruf und technische Einbindung der Schnittstelle
6.2. Abfragen und Aufrufe
In der folgende Übersicht sind einige Beispielaufrufe mit Erläuterungen aufgeführt. Bitte beachten Sie die jeweilig notwendigen Basisaufrufe zu den Beispielen (Suche, Artikeldetailabruf, Index, Verlagsdaten und Medienobjekte)
  Art des Abfrage
   Kapitel
   Typ
   Anfrage
   Kommentar
   Schnellsuche
 5.6.1 Schnellsuche
   GET
 search= Carlos%20Ruiz%20Zaf% C3%B3n
   Schnellsuche nach dem Namen „Carlos Ruiz Zafón“
 Boolesche Suche 5.6.2 Boolesche einer Reihe Suche
GET search=RH%3DRC712
Suche nach der Reihen ID
     VLB-REST-API Spezifikation
44 / 85

   Art des Abfrage
   Kapitel
   Typ
   Anfrage
   Kommentar
   Boolesche Suche mit einer zusätzlichen Datumseinschrän kung
 5.6.2 Boolesche Suche
   GET
 search=VL%3DFISCHER %20Taschenbuch%20un d%20AD%3D20140101% 5E20150323
   Suche nach Verlag und Änderungsdatum von / bis
   Stapelsuche mit Datumseinschrän kung
 5.6.2 Boolesche Suche und 5.6.3 Stapelsuche
   POST
 search= AD%3D20150319%5E20 150320
{ "content": [ { "isbn": "9783923*"} ,
{ "isbn": "405000*"}
] }
   Eine Stapelsuche nach einem ISBN Bereich und einer zusätzlichen Einschränkung Änderungsformat von / bis
 Boolesche Schlagwortsuche
5.6.2 Boolesche Suche
GET search=SW%3D Gl%C3%BCck
Schlagwortsuche
   Boolesche Stichwortsuche mit Produktformein- schränkung
  5.6.2 Boolesche Suche
    GET
  search=ST%3DLinux%20 und%20PF%3Dnicht%20 E*
Bzw.:
ST=Linux%20und%20PF %3Dnicht%20EA
    Stichwortsuche mit einer Produktformeinschrä nkung (hier keine digitalen Produkte bzw. keine Ebooks)
   Boolesche Produkt-Typ Suche
5.6.2 Boolesche Suche
  GET
search=VL%3DLangensc heidt%20und%20PT%3D not%20*Bundle
bzw.
search=VL%3DLangensc heidt%20und%20PT%3D* Bundle
  Bundle Produkte mit MWST Splitting zusammen mit einem weiteren booleschen Parameter selektieren
   EAN Detailaufruf
  5.8 Produkteintrag abrufen
    GET
  product/4049817667903/ ean
    Detailaufruf einer EAN
 ISBN Detailaufruf
Liste von Produkteinträgen abrufen
Index abrufen
5.8 Produkteintrag abrufen
5.7 Liste von Produkteinträgen abrufen
5.11 Indexsuche
GET product/9783775151061/i sbn13
POST product/multipleProducts GET index/author/meier
Detailaufruf einer ISBN
Aufruf des Autorenindex für den Indexeintrag „Meier“
             Cover Aufruf in Größe „Medium“
 5.10 Cover abrufen
    GET
 cover/9783540537120/ m?
    Zum Aufruf des Covers ist ein Token mit Coverberechtigung notwendig
 VLB-REST-API Spezifikation
45 / 85

   Art des Abfrage
   Kapitel
   Typ
   Anfrage
   Kommentar
   Cover Aufruf in Originalgröße (siehe 5.10.2 Cover-Request)
5.10 Cover abrufen
  GET
cover/9783729608887/ ?
  Zum Aufruf des Covers ist ein Token mit Coverberechtigung notwendig
   Abfrage der verfügbaren Medienlinks (Cover und Medienobjekte)
  5.9 Mediendateien abrufen
    GET
  asset/mmo/ec94d0d04 71f4e6284f13f1a5f927c e3
    Zum Aufruf der Liste ist ein Token mit Coverberechtigung notwendig
 6.3. Rückmeldungen der API
Einige Rückmeldungen der API bei Coveraufrufen oder Objekten für die weitere Berechtigungen, außer den Standardberechtigungen, notwendig sind.
Die Tabelle ist keine vollständige Auflistung der Fehlercodes. Es werden die Standard http-Fehlercodes verwendet, die um eine Fehlerbeschreibung ergänzt werden.
Siehe auch dazu das Kapitel 5.4 Fehler.
6.3.1. Rückmeldungen der Login-Funktion
  API-Antwort
  HTTP-Status
          Error Description
"error": "unauthorized"
401
No free slot in one of your registered stateful clients
"error": "unauthorized"
401
Bad credentials
"error": "unauthorized" 401
No stateful client registered for your credentials
    Der Account hat keine freien API-Slots mehr. Es muß ein Token geschlossen werden oder bis nach der Timeout-Zeit gewartet werden.
   Die Login Daten sind falsch.
   Der User ist nicht für die Nuztung der API freigeschaltet. Bitte wenden Sie sich an den Kundenservice der MVB.
 VLB-REST-API Spezifikation
46 / 85

 6.3.2. Rückmeldungen für Metadaten Abruf
Im Folgenden sind die Meldungen für den Abruf der Titel-Metadten sowie in einer weiteren Übersicht die Meldungen beim Abruf der Verlags-Metadaten zusammengestellt.
Die Meldungen der Schnittstelle können auch von dem verwendeten Zugang abhängen:
- Statusloser Zugang
- Statusgebundener Zugang
- Berechtigung für den Zugriff auf archivierte Daten
Rückmeldungen beim Aufruf der Suche
error": "error": "error": "error": "error": "invalid_toke "invalid_toke "unauthorize "not_accept "bad_reque n" n" d" able" st"
401 401 401 406 400
   Bsp Aufruf / API-Antwort
  HTTP-Status
             Error Description
Access token expired / Invalid access token
Invalid token does not contain resource id (metadata)
Full authentication is required to access this resource
Could not find acceptable representatio n
Result window is too large, page + size must be less than or equal to: [10000] but was [XXXXX]
             api.vlb.de/api/v2/ products?page=1 &size=250&sour ce=vlb&search= ST=Stichwort
Ungültiger Access-Token *
Falscher / ungültiger Token
Der Aufruf ist ohne Token erfolgt.
Bitte geben Sie „Content- Type“ und „Accept“ bei der Abfrage im Header an
Die Abfrage hat ein Deep paging Schutz ausgelöst, da die Seitenzahl über 10.000 liegt. Z.B. page = 999999
                *: Beim ersten Aufruf nach dem Ablauf des Token wird „Access token expired“ ausgegeben. Danach gibt die Schnittstelle „Invalid access token“ zurück.
VLB-REST-API Spezifikation 47 / 85

    Rückmeldungen beim Abruf von Artikeldaten
200 401 401 401 403 404 406 406
                     API- Antwort /Bsp Aufruf /
Keine Daten
error": "invalid _token"
"error": "invalid _token"
"error": "unauth orized"
"error ": "forbi dden"
"error ": "not_f ound"
"error": "not_acc eptable"
"error": "not_acc eptable"
          HTTP- Status
                   Error Descripti on
Access token expired / Invalid access token
Invalid token does not contain resource id (meta- data)
Full authenti cation is required to access this resource
Acces s is denied
produ ct not found
Could not find acceptab le represen tation
Could not find acceptab le represen tation
                   api.vlb.de /api/v2/ product/ 9783894 410308/i sbn13
Kann nicht vor- komme n
Ungültig er Access- Token **
Falscher / ungültig- er Token
Der Aufruf ist ohne Token erfolgt.
Der Token / Zugan g hat keine Berech tigung diese Daten abzuru fen ***
ISBN / Identifi er nicht vorhan den bzw. Falsch e ISBN / Identifi er
Bitte geben Sie „Content- Type“ und „Accept“ bei der Abfrage im Header an
Bei Abruf im ONIX Format zeigt der Fehler, dass der Artikel nicht in dem gewünsch ten Format vorliegt
        **: Beim ersten Aufruf nach dem Ablauf des Token wird „Access token expired“ ausgegeben. Danach gibt die Schnittstelle „Invalid access token“ zurück.
***: Diese Meldung kann z.B. auftreten wenn ein Account keine Archiv-Berechtigung hat und versucht Archiv-Artikel abzurufen
Rückmeldungen beim Abruf von Verlagsdaten
  Bsp Aufruf / API-Antwort
  HTTP-Status
    Error Description
api.vlb.de/api/v2/publisher/500553
"error":
"not_found"
404
Cannot determine party with mvbId ..... Für diese Verlags-ID liegen keine Daten vor
    VLB-REST-API Spezifikation
48 / 85

 6.3.3. Rückmeldungen für Cover- und Medienobjekte Abrufe
http-Status Codes und Api Meldungen beim Abruf von Cover und Medienobjekten.
        Bsp Aufruf / API- Antwor t
  Keine Daten
    T101*
   No_co ntent
   "error": "invalid _ token"
  "error": "unauth orized"
    "error": "access _ denied"
   "error": "not_fou nd"
   "error"
    HTTP - Statu s/ Aufru f
   HTTP- Status
 200
   200
  204
  401
 401
   403
  404
  503
   Cover URL Aufruf
 api.vlb. de/api/v 1/ cover/ 97837 657323 24/m?
Kann nicht vor- komme n
  Kann nicht vor- komm en
 Kann nicht vor- komme n. (Cover Aufruf gibt kein 204 zurück)
 Falsche r/ ungültig er Token
Der Account / Token hat keine Archivber echtigung
  Der Token / Zugang hat keine Berechti gung das Cover abzurufe n
 ISBN / Identifier nicht vorhande n bzw. Falsche ISBN / Identifier bzw. kein Cover vorhande n
 Temporär es Problem bei der Bereitstell ung von Cover- Objekten – erneut versuchen
   Medie n- daten Links abrufe n
   api.vlb. de/api/v 1/ asset/m mo/ ec94d0 d0471f4 e6284f1 3f1a5f9 27ce3
  Keine Medien- objekte zu dem Artikel
    Kann nicht vor- komm en
   Das Produkt existiert , hat aber keine Medien objekte (auch kein Cover)
   Falsche r/ ungültig er Token
  Der Account / Token hat keinen Zugriff auf Medienob jekte
    Der Token / Zugang hat keine Berechti gung die Liste der Medieno bjekte abzurufe n
   Identifier ist falsch
   Temporär es Problem bei der Bereitstell ung von Medien- Objekten – erneut versuchen
 Der Endpunkt des Cover- und Medien-Aufrufs hat sich gegenüber der vorheigen Version der Schnitstelle (v1) nicht geändert, so dass der Medien- / Cover-Abruf über eine v1-URL wie auch eine v2-URL möglich ist.
6.4. Beispieldaten
Beispieldatensätze im JSON-Format sind über die Seite https://vlb.de/leistungen/api- spezifikation unter dem Link „Beispiele V2“ REST-API Beispieldaten als ZIP-Datei abrufbar.
Das ZIP-Paket enthält die Beispiele für die Ausgabe im Detailformat sowie Beispiele für die Trefferliste jeweils als einfache Textdatei.
   VLB-REST-API Spezifikation 49 / 85

 Encodings
7.1. HTML-Encoding
Die Werte im XML-Format sind immer HTML-encoded.
Weitere Hinweise zum Zeichen-Encoding sind unter http://www.w3.org/MarkUp/html-
spec/html-spec_13.html zu finden. 7.1. URL-Encoding
URL Parameter müssen URL encoded sein. Nähre Informationen dazu sind unter RFC 1738 (http://www.rfc-editor.org/rfc/rfc1738.txt) zu finden.
    VLB-REST-API Spezifikation 50 / 85

 Kontakt
Allgemeiner Kontakt und Einrichtung von Zugängen sowie Technische Fragen zur VLB-REST-API:
MVB Kundenservice
Tel. +49 69 1306-555
Fax +49 69 1306-255 kundenservice@mvb-online.de
MVB GmbH Braubachstr. 16
60311 Frankfurt am Main
Postfach 10 04 42
60004 Frankfurt am Main
  VLB-REST-API Spezifikation
51 / 85

 Anhang
9.1. Standards und Ausnahmen bei Blöcken und Datenfeldern
Hinweis zu den Feldern der Trefferliste und der Detailausgabe:
- Felder die in der vorliegenden API-Spezifikation nicht enthalten sind, sind vom Anwender nicht zu berücksichtigen. Erst mit Aufnahme in die Spezifikation erhalten die Felder ihre Gültigkeit
- Leere Felder werden nicht ausgegeben (es gibt keine „null“-Werte mehr)
- Leere Listen werden wie auch leere Felder nicht mehr ausgegeben
- Eingebettete Objekte können leer ausgegeben werden, wenn alle Felder darin leer sind (z.B. "edition": {},)
- Die AggregatorId des Aggregator VLB ist „null“ womit das Feld aggregatorId ausgeblendet wird. Das Produkt hat damit
den Aggregator „VLB“.
- Die Datumswerte innerhalb des „Contributor“ Blockes sind Freitextfelder
- Das Feld „identifier“ enthält den Haupt-Identifier des jeweiligen Produktes. D.h. bei ÖSB Titeln die österreichische
Schulbuchnummer, bei Buchtiteln die ISBN ohne Bindestriche und bei Non-Book-Artikeln die GTIN ohne Bindestriche.
- Wiederholbare Blöcke werden in der Reihenfolge ausgegeben, in der die Darstellung der Werte vorgesehen ist. D.h.
Sequenznummern werden bis auf wenige Blöcke nicht ausgegeben. Die Sequenz ist durch die Reihenfolge in der
Ausgabe festgelegt.
- Die Version 2 der REST-API basiert auf ONIX 3.1 und damit auf den ONIX 3.1 Codelisten
9.2. Darstellung von Produkten mit Mehrwertsteuer-Splitting (Bundle-Produkte)
Bei der Darstellung von Produkten mit Mehrwertsteuer-Splitting (Bundle-Produkte) sind folgende Hinweise bei der Preisverarbeitung zu beachten:
 VLB-REST-API Spezifikation 52 / 85

 Falls die Anzahl der Productparts (9.5.18) mit der Anzahl der Tax Elemente innerhalb des Preisblockes (9.5.15) übereinstimmt, können die beiden Elementgruppen productparts und taxes in Ihrer Reihenfolge aufeinander korreliert werden.
Im Fall, dass die Anzahl aufgrund späterer Anpassung der MWST-Splitting Regel nicht mehr übereinstimmt, können die beiden Elememntgruppen nicht mehr miteinander abgeglichen werden. Damit ist eine Steuersatzzuordnung zu productparts nicht mehr möglich. Diesen Fall gibt es bereits jetzt bei nicht DE-Preisen (aktuell z.b: US-Preise, CHF).
Alles weitere wird bei einer Änderung der MWST-Splitting Vorgabe mitgeteilt. Informationen des Börsenverein des Deutschen Buchhandels zu diesem Themna:
- Mehrwertsteuer bei E-Bundle-Produkten 9.3. Beispieldaten
Beispieldatensätze im JSON-Format sind über die Seite https://vlb.de/leistungen/api-spezifikation unter dem Link „Beispiele V2“ als ZIP-Datei abrufbar.
Das ZIP-Paket enthält die Beispiele für die Ausgabe im Detailformat sowie Beispiele für die Trefferliste jeweils als einfache Textdatei.
  9.4. Hinweise zu den Feldern der Trefferliste
Im Folgenden eine kurze Erläuterung für einige Felder der Trefferliste:
                   Feldbezeichnung v2
Feldtyp /
Werte- bereich / ONIX Code- list
Mapping v1
Short /
Long
Beispiel
Kommentar
            productId Individueller id Wert
Short/ 1d6a9158f1f24f67b572cf1b4b964463 Long
UUID des Artikels
      VLB-REST-API Spezifikation
53 / 85

    Feldbezeichnung v2
     Feldtyp / Werte- bereich / ONIX Code- list
   Mapping v1
     Short / Long
   Beispiel
     Kommentar
 version
Individueller Wert
version Long
  identifier
   Individueller Wert
 identifier
   Long
 4049817679876 bzw. 978376573232 bzw. SB170504
   Das Feld „identifier“ enthält den Haupt- Identifier des jeweiligen Produktes. D.h. bei ÖSB Titeln die öster. Schulbuchnummer, bei Buchtiteln die ISBN ohne Bindestriche und bei Non-Book Artikeln die GTIN ohne Bindestrich.
  isbn
   Individueller Wert
b244 / b221 (15)
 isbn
   Short/ Long
 978-3-7657-3232-4
   ISBN mit Bindestrich. Nicht bei Non-Book Produkten
  gtin
    Individueller Wert
b244 / b221 (03)
  gtin
    Short/ Long
  978376573232
    Verwendet bei Printtitel, Ebooks, Audio Books und Non- Books
 osbnr
umbreitNummer
schulbuchBestellnumm er
Individueller Wert
Individueller Wert
Individueller Wert
osbnr
umbreitNummer
Short/Lon SB170504 g
Short/ 7512103 Long
1504-54 bzw. MA19
Öster. Schulbuchnummer
Bestellnummer des Barsortiments Umbreit
Bestellnummer bei Schulbüchern
  bestellnummer
    Individueller Wert
  bestellnummer
    Short/Lon g
  SB170504 bzw. 1504-54 bzw. MA19
    Bestellnummern- angabe des Verlages
   cbzNummer
    Individueller Wert
  cbzNummer
    Short/Lon g
  18172985
    Bestellnummer des Schweizer Buchzentrums (SBZ)
       VLB-REST-API Spezifikation
54 / 85

    Feldbezeichnung v2
    Feldtyp / Werte- bereich / ONIX Code- list
  Mapping v1
    Short / Long
  Beispiel
    Kommentar
  title
   Individueller Wert
b203 / b202 (01)
 title
   Short/ Long
 Mathe lernen: Zeit
   Titel des Artikels
  subTitle
    Individueller Wert
B029
  subTitle
    Short/ Long
  IFIP TC11 / WG11.3 Fifteenth Annual Working Conference on Database and Application Security July 15–18, 2001, Niagara on the Lake, Ontario, Canada
    Untertitel des Artikels
 publisher publisherMvbId
edition
productType
priceEurD
priceEurA
priceCHF
unpricedItemCode creationDate
Individueller publisher
Wert
Individueller publisherMvbId Wert
b058
productType
Individueller priceEurD Wert
Individueller priceEurA Wert
Individueller priceCHF Wert
j192
Individueller createDate Wert
Short/ Buch Verlag Kempen Long
Short/ 89804 bzw. 5234041 Long
Short/ 1st Corrected ed. 2006. Corr. 3rd printing Long 2006
Short/ pbook Long
Short/ 6.95 Long
Short/ 6.95 Long
Short/ 12.5 Long
Null bzw. 04 Short/ 24.03.2015
Long
Verlagskurzbezeichnun g VLB
Verlags-ID des Verlages
        publicationDate
    b003
      Short/ Long
      im Format DD.MM.YYYY, bzw. MM.YYYY bzw. YYYY
   productAvailability
    j396
  availabilityStatePublis her
    Short/ Long
  20
    Original Availability vom Publisher gemeldet (j396)
 Siehe 9.4.1 productType Werte Euro Preis Deutschland
Euro Preis Österreich
CHF Preis Schweiz
Erstelldatum des Produkts
                                    VLB-REST-API Spezifikation
55 / 85

    Feldbezeichnung v2
     Feldtyp / Werte- bereich / ONIX Code- list
   Mapping v1
     Short / Long
   Beispiel
     Kommentar
 lastModificationDate active
collections
collectionId
title
subtitle partNumber
productForm productFormDetail announcementDate
author contributors
type firstName
lastName groupName
Individueller Wert boolean
Block
b203 b029
List 150 List 175
Block
List 17
Individueller Wert Individueller Wert Individueller Wert
lastModifiedDate Short/ Long
state Short/ Long
collections Short/ Long
identifiers Short/ Long
title Short/ Long
subtitle Short/ Long
identifiers
Short/ Long Short/ Long
announcementDate Short/ Long author Short Long Long
24.03.2015 true
AAYBD53
Buch und Buchhandel in Zahlen Zahlen für den Buchhandel
3
Letztes Bearbeitungsdatum true oder false
Festlegung ob es sich um eine Reihe handelt
Titel der Reihe oder Hierarchie Untertitel der Reihe oder Hierarchie Bandnummer
                    setId
      identifiers
      "X-3532-0783-7
    Festlegung ob es sich um eine Hierarchie handelt
                                                       Long Brigitte
Long Neuböck-Hubinger Long
Vorname Nachname Firmenname
                  VLB-REST-API Spezifikation
56 / 85

    Feldbezeichnung v2
    Feldtyp / Werte- bereich / ONIX Code- list
  Mapping v1
    Short / Long
  Beispiel
    Kommentar
  priceAdditionEurD
      priceAdditionEurD
    Long
  UVP
    Kennzeichnung unverbindl. Preiseempfehl.
 taxEurDInfo taxKeyEurD priceCaEurD priceProvisionalEurD
priceCalculatedEurD
taxEurAInfo taxKeyEurA priceCaEurA priceProvisionalEurA
taxChfInfo
Individueller Wert Individueller Wert Individueller Wert boolean
boolean
Individueller Wert Individueller Wert Individueller Wert boolean
Individueller Wert
Long 0% MwSt.-Angabe vom Verlag Long 1
Long Ca.
Short/ true
Long
Short/ Long
Long 0% MwSt.-Angabe vom Verlag Long 1
Long Ca.
Short/
Long
Long 0% MwSt.-Angabe vom Verlag
MWST Angabe vom Verlag Mehrwertsteuerschlüss el
Ca. Preis EurD
True oder false für Ca. Preis EurD
True oder false
Mehrwertsteuerschlüss el
Ca. Preis EurA
True oder false für Ca. Preis EurA
                    priceFixedEurD
    boolean
      Short/ Long
  true
    True oder false für gebundener Verkaufspreis
   priceAdditionEurA
    Individueller Wert
      Long
  UVP
    Kennzeichnung unverbindl. Preiseempfehl.
                     priceAdditionChf
    Individueller Wert
      Long
  UVP
    Kennzeichnung unverbindl. Preiseempfehl.
       VLB-REST-API Spezifikation
57 / 85

    Feldbezeichnung v2
     Feldtyp / Werte- bereich / ONIX Code- list
   Mapping v1
     Short / Long
   Beispiel
     Kommentar
 taxKeyChf priceCaChf priceProvisionalChf themaSubjects themaQualifiers
onSaleDate
language wholesaler
coverUrl
genreCode
Individueller Wert Individueller Wert
Individueller Wert Individueller Wert
Individueller Wert
ONIX List 74
Individueller Wert
Individueller Wert
themaSubjects themaQualifiers
onSaleDate
language sigl
coverUrl
genreCode
Long 1 Long Ca. Long
Long WTR Long 1DFG
Long
Long eng / ger / fre Long C-BZ/A-MLO/U
Long http://api.vlb.de/api/v2/cover/9783142345678 /m
Long 1295
Mehrwertsteuerschlüss el
Ca. Preis Chf
True oder false für Ca. Preis Chf Thema-Inhalt
Thema-Zusatz
Erstverkaufsdatum
Sprache des Atrikels Sigel Informationen
Verlinkung zu einem Cover sofern verfügbar
Warengruppen- Nummer
                          keyWords
    Individueller Wert
ONIX List 27, value 20
  keyWords
    Long
      Schlagworte
               aggregatorId
      aggregatorId
    Long
  Null bzw. 5001015
    Siehe Kapitel 5.13 Übersicht der Aggregatoren
   shortDescription
   Individueller Wert
 shortDescription
   Long
    Kurzberschreibung begrenzt auf max. 1500 Zeichen
  mainDescription
    Individueller Wert
  mainDescription
    Long
      Hauptbeschreibung begrenzt auf max. 1500 Zeichen
       VLB-REST-API Spezifikation
58 / 85

 9.4.1. productType Werte
Die folgenden Werte können in dem Feld „productType“ erscheinen
  Produktart
   Produktform b012 / Erläuterung (teilweise List 150)
   Selektierbar über PT
   ProductType (case- sensitive)
 Buch
E-Book
Audio/Video
Kalender kartographisches Material Digitales Produkt Non-Book
Undefiniert
Reihe
Hierarchie
zweiteiliges Bundle Undefiniert
B*
E*
A*, V*
PC
C*
D*, aber nicht E*
alle anderen Werte außer 00 00 oder nicht weiter definiert
Keine ONIX Entsprechung Keine ONIX Entsprechung
ja
pbook ebook abook calendar map digital nonbook undefined Series
Set duoBundle Undefined
                                                9.4.2. Genre code – Hinweis zu der Warengruppen-Klassifikation
Beim genrecode aus der Trefferliste handelt es sich um die Warengruppe des Produktes.
Die gleiche Warengruppen-Klassifikation wird auch im Detail-Block „subjects“ für type „26“ verwendet.
Eine Übersicht zu der Warengruppensystematik ist über die Seite www.vlb.de – „Verlage“ – „Downloadcenter“ abrufbar. Hier die Links im einzelnen:
PDF mit Erläuterungen: https://vlb.de/assets/images/wgsneuversion2_0.pdf
  VLB-REST-API Spezifikation 59 / 85

 bzw. (Excel-Datei, nur die Codes + Übersetzung): https://vlb.de/assets/images/wgsneu_mit_index_20060802.xlsx Eine generelle Hinweise zu der Produktklassifikation: https://vlb.de/hilfe/vlb-verlag/titelerfassung/produktklassifikation
9.4.3. Kennzeichnung Referenzpreis
Das eigene Feld für die Kennzeichnung des Referenzpreises ist ab der Version 2 der REST-API entfallen. Die Kennzeichnung kann über eine Kombination der Felder
   Preisfeld
   EUR-D
   EUR-A
 priceProvisionalEurD priceFixedEurD priceProvisionalEurA priceFixedEurA
ist.
9.5. Übersicht der notwendigen ONIX Codelisten
In den folgende Tabellen sind die in der REST-API V2 verwendeten Felder aufgeführt.
Primär sind die Tabellen für v2 Nutzer gedacht. Für einen besseren Umstieg von v1 auf v2 wurden zusätzlich noch die Felder der v1 aufgenommen.
9.5.1. Felder ohne Klassenzugehörigkeit
Die folgenden Felder sind auf Produktebene zu finden und sind keiner Klasse zugeordnet.
false true
      false
   true
Ein Preis kann nur Referenzpreis sein, wenn keine ca.-Preiskennzeichnung vorliegt und der Preis ein gebundener Ladenpreis
     Element
   V2
   O3- Liste
   Wieder- holbar
   O3-Short
   V1
   O21- Liste
   O21-Short
 Status des Artikel Individuelle ProduktID ID aus Altsystem
active productId bvdId
active
a001 id a001
bvdId
                        VLB-REST-API Spezifikation
60 / 85

   Element
   V2
   O3- Liste
   Wieder- holbar
   O3-Short
   V1
   O21- Liste
   O21-Short
 Aggregator des Produktes Erscheinungsdatum
Ankündigungsdatum
Vorr. Auslieferungsdatum Erstverkaufstag
Erstveröffentlichung des Ursprungswerkes Abschlussarbeit-Typ
Jahr der Abschlussarbeit Herstellungsland
Lieferbarkeitsangabe Publikationsstatus Publikationsstatus
Produkttyp
ONIX Bundle flag Artikel ohne Preis
Artikel ohne Autor / Urheber
aggregatorId publicationDate
announcementDate
availabilityDate onSaleDate
yearFirstPublished thesisType
thesisYear countryOfManufacture
productAvailability publishingStatus publishingStatusNote
productType productComposition unpricedItemCode
noContributor
List 65 List 64
List 2
x448 = 01
b306
x448 = 09 / B306
x461 = 08 / B306
x448 = 02 B306
x448 = 20b306
b368
b370
J396 b394
b395 X314
aggregatorId publicationDate
announcementDa te
availabilityDate
onSaleDate
thesisType
thesisYear
countryOfManufa cture
availability
publishingStatus
publishingStatus Note productType
-
unpricedItemCod e
noContributor
b003
B086
j142 j143
b368
b370 J396
- - - -
                                                  Institution bei der die Abschlussarbeit eingereicht wurde
   thesisPresentedTo
         b369
   thesisPresentedT o
       b369
                                                                   Status des Produkts in einem spezifizierten Markt. Notwendig für promotionCampaign
  marketPublishingStatus
   List 68
   J407
         Freitext zur Beschreibung der Werbekampagne für das Produkt
   promotionCampaign
       k165
         VLB-REST-API Spezifikation
61 / 85

   Element
   V2
   O3- Liste
   Wieder- holbar
   O3-Short
   V1
   O21- Liste
   O21-Short
 Stadt/Ort der Publikation Land der Publikation
Sonderausgabenkennzeichen
Erstellungsdatum
Letztes Änderungsdatum
Fortlaufend Generierte Nummer
Angabe ob der Artikel ein MWST-Splitting hat. Mindestbestellmenge
Verpackungseinheit
publicationCity publicationCountry
tradeCategory creationDate lastModificationDate bitNo
splitVat
orderQuantityMinimum orderQuantityMultiple
ja
B209 publicationCity
B083 publicationCountr y
B384 tradeCategory createdDate
                List 12
Lsist 12 B384
                lastModifiedDate bitNo
                bundle - -
        x532 x533
                0 1 2 6
Z R S
9.5.3. ancillarycontents - Abbildungen
Keine MWST-Angabe Reduzierter MWST Satz
Voller MWST-Satz
Bundle MWST Kennzeichnung
9.5.2. taxKeyEurD / taxKeyEurA / taxKeyChf
Die folgenden Werte können in dem Feld „taxKeyXX“ erscheinen
  taxkey
   ONIX Code
   Bedeutung
             Detailierte Angaben sind über die VLB-Hilfe unter Abbildungen abzurufen.
 VLB-REST-API Spezifikation
62 / 85

 Der Inhalt dieses Blockes ist wiederholbar.
  Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Abbildungsart Abbildungsbeschreibung Abbildungsanzahl
ancillaryContentType ancillaryContentDescription number
List 25 x423
x424 description
List 25 b256 b361 b257
type b257 number
                     9.5.4. audiences - Zielgruppe und Altersempfehlung
Detailierte Angaben sind über die VLB-Hilfe unter Zielgruppe und Altersempfehlung abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Zielgruppenbeschreibung
Art der Altersempfehlung
von-/bis-Angabe
von-/bis-Wert
Empfehlungssystem
Name des Empfehlungssystems
Wert im Empfehlungssystem
audienceDescription audienceRangQualifier audienceRangeAgeFrom audienceRangeAgeTo audienceCodeType audienceCodeTypeName
audienceCodeValue
b207 description List 30 b074 rangeCode List 31 b075 ageFrom
b076 ageTo List 29 b204 type
b205 codetypename b206 value
b207 List 30 b074 List 31 b075 b076 List 29 b204 b205
b206
                                                 VLB-REST-API Spezifikation
63 / 85

 9.5.5. citedContents – Zitierter Inhalt
Detailierte Angaben sind über die VLB-Hilfe unter Zitierte Inhalte abrufbar. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Zusatztextartencode Zusatztext-Zielgruppe
Name der Bestseller-Liste Position auf Bestseller-Liste Link 1 zum Text
Link 2 zum Text
Link 3 zum Text Quelltitel
Quelltyp Bemerkung Erstveröffentlichung
Gültig von Gültig bis
letzte Änderung
citedContentType citedContentAudience
listName listPosition resourceLink1 resourceLink2 resourceLink3 sourceTitle sourceType citationNote publicationDate
validFrom validUntil lastUpdated
x430 - x427 -
x432 -
x433 -
x435 - x435 - x435 - x428 -
List 157 x431 - x434 - x429=01; -
b306
x429=14/24; - b306
x429=15/24; - b306
x429=17; - b306
                                                                                                  9.5.6. collections - Mehrbändige Werke – Reihen und Hierarchien
Detailierte Angaben sind über die VLB-Hilfe unter Mehrbändige Werke (Collection) – Reihen und Hierarchien abzurufen.
 VLB-REST-API Spezifikation 64 / 85

 Der Inhalt dieses Blockes ist wiederholbar.
  Element
   v2
   O3- Liste
   O3-Short
   v1
   O21- Liste
   O21-Short
 Collection-Id (Reihen-ID) Hierarchie-ID
Untertitel Bandnummer
collectionId setId
subtitle partNumber
b244
b029 mit x409=02 x410 mit x409=01
Type Active
Subtitle
sequence
b244
b244 b233=VLB-Xnr
b029
          Titel der Reihe oder Hierarchie
  title
      b203 mit x409=02
   Title
       b203 bzw. b018 b203 bzw. b023
               9.5.7. contributors - Urheber
Detailierte Angaben sind über die VLB-Hilfe unter Urheber abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Urhebernummerierung Urheberart
Übersetzt aus Übersetzt in Namenstyp
GND
sequenceNumber contributorRole fromLanguage toLanguage nameType
gnd
-
List 17 List 74 List 74 List 18
List 44
- -
b034 b035 x412 x413 x414
nameidentifier/
x415=25 b244
sequence role language
dnbid
b034 List 17 b035 List 74 b252
-
- personnameide
List 101 ntifier/ b390=25
b244
                                                    VLB-REST-API Spezifikation
65 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 ISNI
isni
List 44
-
-
List 44
-
-
-
List 177 -
-
-
List 177
- - - -
- -
- - -
nameidentifier/
x415=16
b244 nameidentifier/ x415=21
b244
b039
b040 contributordate/ x417=50
b306 mit dateformat
contributordate/ x417=51
b306 mit dateformat
professionalaffiliation/ b045 professionalaffiliation/ b046
b047 b044
personnameide List 101 ntifier/
b390=16 b244
-
b039
b040 persondate/ b305=007
List 75 j260
b306 persondate/ b305=008
List 75 j260
b306 professionalaffil iation/
b045
professionalaffil iation/
         b046
         b047
         b044
                      ORCID orcid
Vorname firstName Nachname lastName
dateOfBirth Geburtsdatum dateOfBirthFormat
dateOfDeath Sterbedatum dateOfDeathFormat
firstName lastName
dateOfBirth dateOfBirthFor mat
dateOfDeath
dateOfDeathFor mat
professionalPos ition
professionalPos ition groupName biographicalNot e
                                                                      Beruf
Firma
professionalPosition
                 professionalAffiliation Name der Körperschaft corporateName
Biografische Angaben biographicalNote
                     VLB-REST-API Spezifikation
66 / 85

 Der Knoten publishers kann den Subknoten 9.5.27 websites zur Angabe einer URL des Verlages enthalten
9.5.8. copyrights
Detailierte Angaben sind über die VLB-Hilfe unter Copyright abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Copyright-Art
Copyright-Jahr
Name des ersten Copyright-
Besitzers (Person)
Name des zweiten Copyright- Besitzers (Person)
Name des dritten Copyright- Besitzers (Person)
Name des ersten Copyright- Besitzers (Körperschaft) Name des zweiten Copyright- Besitzers (Körperschaft) Name des dritten Copyright- Besitzers (Körperschaft)
copyrightType copyrightYear
personName1 personName2 personName3 corporateName1 corporateName2 corporateName3
List 219 x512 - - b087 -
- b036 - - b036 - - b036 - - b047 - - b047 - - b047
                                                        9.5.9. edition - Auflage
Detailierte Angaben sind über die VLB-Hilfe unter Auflage, Publikationsort und Erscheinungsland abzurufen. Es werden nicht alle Onix-Felder im Block „edition“ ausgegeben.
 VLB-REST-API Spezifikation 67 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Auflagenart editionType List 21 x419 Auflagennummer editionNumber - b057 Auflagentext editionStatement - b058 Auflagenversion editionVersionNumber - b217
9.5.10. extent - Umfang
type List 21 b056 number b057 text b058 release B217
                            Die unter den Umfangsangaben gebündelten Eigenschfaten des Produktes sind im Block „extent“ zusammengefasst.
Alle folgenden Felder sind unter dem Block „extent“ zusammengefasst. Zur besseren Übersicht sind die Tabellen einzeln aufgeführt.
Im Fall der aufgeführten Listen 23 und 24 gilt: List 23 für Type und List 24 für Unit)
Seitenzahlen
Detailierte Angaben sind über die VLB-Hilfe unter Seitenzahlen abzurufen.
    Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Gesamtanzahl Seiten Seitenanzahl Hauptinhalt Seitenanzahl Titelei Seitananzahl Nachspann Anzahl nummerierter Seiten
contentPageCount mainContentPageCount mainContentPageCount backMatterPageCount totalNumberedPages
List 23 / List 24 List 23 / List 24 List 23 / List 24 List 23 / List 24 List 23 / List 24
b219 mit b218=11 und b220=03
b219 mit b218=00 und b220=03
b219 mit b218=00 und b220=03
x421 mit b218=04 und b220=03
b219 mit b218=05 und b220=03
pages pagesArabic pagesRoman
b061
b255 List 23 b218=03
                                   VLB-REST-API Spezifikation
68 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Anzahl produzierter Seiten
Anzahl unnummerierter Seiten
Seitenanzahl exakt
Seitenanzahl zugehöriges Print-Produkt
Seitenanzahl ungefähr
productionPageCount unnumberedInsertPageCount absolutePageCount printCounterpartPageCount digitalProductPageCount
List 23 / List 24 List 23 / List 24 List 23 / List 24 List 23 / List 24 List 23 / List 24
b219 mit b220=03 b219 mit b220=03 b219 mit b220=03 b219 mit b220=03 b219 mit b220=03
b218=06 und b218=12 und b218=07 und b218=08 und b218=10 und
                                   DRM-Art
 Detailierte Angaben sind über die VLB-Hilfe unter DRM-Art abzurufen. DRM-Art drmCode List 144 x317
Dateigröße
Detailierte Angaben sind über die VLB-Hilfe unter Dateigröße abzurufen.
drmCode
List 144
   Element
   V2
   O3- Liste
   O3-Short
   O21-Liste
   O21- Short
   O21-Liste
            Element
   V2
   O3- Liste
   O3-Short
   V1
    Dateigröße fileSize List 23 / b219 mit Die Dateigröße (fileSize) wird auf Bytes normalisiert (Liste 24 Code 17).
O21- Liste
List 23
O21-Short
b218=22
b218=22 und List 24 b220=17/18/19
fileSize
       VLB-REST-API Spezifikation 69 / 85

 Laufzeit, Track-Anzahl und Kartenmaßstab
Detailierte Angaben sind über die VLB-Hilfe unter Laufzeit, Track-Anzahl und Kartenmaßstab abzurufen.
O21-
    Element
   V2
   O3- Liste
   O3-Short
   V1
   Laufzeit
 duration
   List 23 / List 24
 b219 mit b218=09 und b220=04/05/06/14/15/1 6
   duration
   O21-Short
   b218=09
 b219 mit b218=09 und b220=11
b063 Die Spieldauer (duration) wird auf Minuten normalisiert (Liste 24 Code 05).
Liste
List 23
List 23 b218=09 b063
Track-Anzahl Kartenmaßstab
numberOfTracks mapScale
List 23 / List 24 -
numTracks mapScale
             Abbildungen
Detailierte Angaben sind über die VLB-Hilfe unter Abbildungen abzurufen.
    Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
O21-Short
b125 b062
 Gesamtanzahl Abbildungen numberOfIllustrations Abbildungstext illustrationNote
9.5.11. form - Produktform
- b125 - b062
numillustrations illustrationText
            Detailierte Angaben sind über die VLB-Hilfe unter Produktform abzurufen. VLB-REST-API Spezifikation
70 / 85
 
   Element
   V2
   O3- Liste
   O3-Short
   V1
   Produktform Produktform – detailliert Primärer Produktinhalt
binding
productContentT ype
description packaging
height width thickness diameter weight
productForm productFormDetail
primaryContentType
productContentType
productFormDescription productPackaging
height width thickness diameter weight
formFeatures - Warnhinweise
List 150 b012 List 175 b333 List 81 x416
List 81 b385 - b014
List 80 b225
List 48 x315=01 List 50 c095=mm - c094
List 48 x315=02 List 50 c095=mm
c094 List 48 x315=03
List 50 c095=mm
- c094
List 48 x315=09/12 List 50 c095=mm
- c094 List 48 x315=08 List 50 c095=g - c094
O21-
Liste
List 7 b012 List 78 b333
-
List 81 b385
b014 List 80 b225
List 48 c093=01 List 50 c094
c095=mm List 48 c093=02
List 50 c095=mm c094
List 48 c093=03 List 50 c095=mm
c094
List 48 c093=09/12
List 50 c095=mm c094
List 48 c093=08 List 50 c094
c095=g
O21-Short
                   Produktinhalt
VLB-Einbandart Verpackung
Höhe
Breite
Tiefe Durchmesser Gewicht
9.5.12.
                                                                                        Detailierte Angaben sind über die VLB-Hilfe unter Warnhinweise abzurufen. VLB-REST-API Spezifikation
71 / 85
 
 Der Inhalt dieses Blockes ist wiederholbar.
  Element
   V2
   O3- Liste
   O3-Short
   V1
   Art des Warnhinweis Warnhinweis
List 184
b334=13 type
b335 code b334=13
b336 description
productFormFeatureType productFormFeatureValue -
- productFormFeatureDescription -
O21-
Liste
List b334=13 184 b335
b334=13 b336
O21-Short
                       9.5.13. identifiers- Produktnummern
Detailierte Angaben sind über die VLB-Hilfe unter Produktnummern abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21-
Liste
List 5 b221
b233 b244
O21-Short
 iD Typ
ID Benennung Wert
9.5.14.
productIdentifierType idTypeName
idValue
languages - Produktsprache
List 5
b221 type
      b233 typeName
-
- b244 value
            Detailierte Angaben sind über die VLB-Hilfe unter Titel und Produktsprache abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
 VLB-REST-API Spezifikation 72 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Art der Sprache Sprache
9.5.15.
languageRole List 22 b253 type languageCode List 74 b252 value
prices - Preise
List 22 b253 List 74 b252
              Detailierte Angaben sind über die VLB-Hilfe unter Preise abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
  Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Preistyp
Price-Qualifier
Anmerkung zum Preis
Ungefährer Preis
Brutto-(Gesamt-)Preis
Angabe ob der Preis berechnet wurde Kapitel 9.5.15.1.1 Währung
Land Gebiet
gültig ab gültig bis
priceType priceQualifier priceTypeDescription priceStatus priceAmount
calculated
taxes currencyCode countriesIncluded regionsIncluded
validFrom validUntil
List 58 List 59 -
List 61 -
-
-
List 96 List 91 List 49
List 173 List 173
x462 type
j261 typeQualifier j262 typeDescription j266 state
j151 value
j152 currency
territory/ x449 country
territory/ x450 territory
PriceDate/ x476=14/24 validFrom b306
PriceDate/ x476=15/24 validUntil b306
List 58 j148 List 59 j261 j262 List 61 j266 j151
List 96 j152 List 91 b251 List 49 j303
j161 j162
                                                                                    VLB-REST-API Spezifikation
73 / 85

 9.5.15.1.1. taxes (innerhalb des Prices-Block)
Der Block „Taxes“ ist nur innerhalb des Prices Block verfügbar.
Mehrwertsteuersatzcode taxRateCode - x471 Mehrwertsteuersatz taxRatePercent - x472 Betrag vom Preis, für den taxableAmount - x473 Mehrwertsteuer anfällt
Mehrwertsteuerbetrag taxAmount - x474
9.5.16. prizes – Preisverleihung
Detailierte Angaben sind über die VLB-Hilfe unter Preisverleihung abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
List 62
  Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
                                Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Name der Preisverleihung Jahr der Preisverleihung
Preisverleihungstyp Anmerkung
prizeName prizeYear
prizeCode prizeStatement
- g126 - g127
List 41 g129 - x503
- -
- -
          Land der Preisverleihung
  prizeCountry
    List 91
(ISO 3166-1 2)
  g128
   -
                      VLB-REST-API Spezifikation
74 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Jury/Organisation prizeJury - g343 -
9.5.17. productClassifications - Zolltarifnummer
Detailierte Angaben sind über die VLB-Hilfe unter Zolltarifnummer & Herstellungsland abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
          Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Produktklassifikationscode productClassificationType List 9 b274=04
Produktklassifikation productClassificationCode - b275 In den meisten Fällen wir hier die Zolltarifnummer zu finden sein.
9.5.18. productParts – (v1: containeditems) - Teilprodukte und Beigaben
Detailierte Angaben sind über die VLB-Hilfe unter Teilprodukte und Beigaben abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
type value
b274=04 b275
                 Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Primäranteil
Art der Produktnummer
primaryPart productIdentifierType
List 5
x457
productidentifier/ b221
productIdentifier Type
-
List 5 productidentifi
er/ b221
              VLB-REST-API Spezifikation
75 / 85

    Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Typbeschreibung der Produktnummer
Produktnummer
Produktform Produktform – detailliert Beschreibung
Produktinhalt
Anzahl Teile Anzahl Kopien
productIdentifierTypeName
productIdentifierValue productForm productFormDetail productFormDescription
productContentType numberOfItemsOfThisForm
numberOfCopies
- -
List 150 List 175 -
List 81
- -
b233
productidentifier/ b244
b012
b333
b014
b385
x322 x323
productIdentifierT ypeName
productIdentifier Value
type
productContentTy pe numberOfPieces
List 7 List 78
List 81
B233
productidentifi er/ b244
b012
b333
b014 b385
b210 b015
                                                        9.5.19.
publisherData
Der Block “publisherData” ist für statuslose Token nur nach Freischaltung durch den MVB Kundenservice verfügbar.
  JSON Feld
   Beispiel
   Kommentar
 mvbId shortName name street cityStreet zipStreet country
5106488
MVB
MVB GmbH Braubachstr. 16
DE
Die MVB ID des Verlages (entspricht dem Request Parameter) Kurzbezeichnung für den Verlag
Voller Verlagsname
Straßenname
Ortsname zur Straßenangabe
PLZ zur Straßenadresse
Länderangabe (zweistelliger ISO-Ländercode)
                     VLB-REST-API Spezifikation
76 / 85

   JSON Feld
   Beispiel
   Kommentar
 postbox phone
fax
email
url isbnPrefixes deliveryBS
10 04 42
+49 69 1306550
+49 69 1306255 kundenservice@mvb-online.de www.mvb-online.de 978-3-7657,978-3-65
Null
Postfach des Verlags Telefonummer Faxnummer Mailadresse
URL der Verlagsseite
Alle ISBN Präfixe, die diesem Verlag zugeordnet sind (als Block) Barsortimentsauslieferungsangaben
                     deliveryNote
   „N“
   SOA Lieferhinweis (
- E: “Verlag liefert gänzlich oder mit Teilen der Produktion nur an Endverbraucher.“
- R: “Verlag liefert gänzlich oder mit Teilen der Produktion in Ausnahmefällen ohne Rabatt an das Sortiment.“
- N: “Verlag liefert gänzlich oder mit Teilen der Produktion nur gegen Vorkasse oder per Nachnahme.“
 bagCreditor
bagDebitor
tax
siglDe
siglAt
siglCh
vnrKreditor vnrKreditorAt vnrKreditorCh gln
False
False DE114130036
10871
4018544000000
Abrechnung über die BAG (true/false) Abrechnung über die BAG (true/false) Die Umsatzsteuer ID des Verlages Sigel Deutschland
Sigel Österreich Sigel Schweiz
Kreditorische Verkehrsnummer kreditorische Verkehrsnummer Österreich kreditorische Verkehrsnummer Schweiz
                              VLB-REST-API Spezifikation
77 / 85

 9.5.20. publishers - Verlage
Detailierte Angaben sind über die VLB-Hilfe unter Verlage und Imprints abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3-Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Verlagsrolle Verlagsname
Identifiertyp Identifier
publishingRole publisherName
publisherIDType iDValue
List 45
-
List 44
-
b291
b081 bzw. b079
publisheridentifier/ x447 publisheridentifier b244 b295
type name
nameCodeType publisherid
List 45 b291 b081 bzw.
b079
List 44 b241 b243 b295
          Name im Adressbuch des deutschsprachigen Buchhandels
  adbName
    -
     adbName
                      Der Knoten publishers kann folgende Subknoten enthalten: • 9.5.27 websites zur Angabe einer URL des Verlages
9.5.21. relatedProducts - Produktverweise
Detailierte Angaben sind über die VLB-Hilfe unter Produktverweise abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
Art des Produktverweises productRelationCode List 51 x455
Type
List 51 h208
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
        VLB-REST-API Spezifikation
78 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Art der Produktnummer Produktnummer
Produktform Produktform – detailliert
productIdType productIdValue
productForm productFormDetail
List 5
-
List 150 List 175
productidentifier/ b221
productidentifier/ b244
b012 b333
productIdType productIdValue
productForm
productFormDeta il
List 5 productidentifi er/ b221
productidentifi
er/ b244 List 7 b012
List 78 b333
                            9.5.22. salesRight - Verkaufsrechte
Detailierte Angaben sind über die VLB-Hilfe unter Verkaufsrechte abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Art des Verkaufsrecht Land
Gebiet
9.5.23.
salesRightsType countriesIncluded regionsIncluded
subjects - Produktklassifikation
List 46 List 91
List 49
B089 territory/ x449 territory/ x450
type country territory
List 46 b089 List 91 b090
List 49 b388
                     Detailierte Angaben sind über die VLB-Hilfe unter Produktklassifikation abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
 VLB-REST-API Spezifikation 79 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Primäre Produktklassifikation Bezeichnung der Klassifikationsquelle
Versionsnummer der Produktklassifikation Name der Produktklassifikation Code
Benennung Lesemotive (B067 =
 01
 02
 03
 04
 05
 06
 07
 08
 09
 10
mainSubject - x425 sourceName -
subjectSchemeVersion - b068 subjectSchemeName - b171
subjectCode - b069 subjectHeadingText - b070
Auseinandersetzen Eintauchen Entdecken Entspannen Lachen Leichtlesen Nervenkitzeln Optimieren Orientieren Verstehen
main - sourceName
systematicVer b068 sion
schemeName b171
code b069 value b070
          Art der Produktklassifikation
  subjectSchemeIdentifier
    List 27
  b067
   type
    List 26 bzw. List 27
   b191 bzw b067.
                             B8)
  CodeNr
   Lesemotiv Text
                     Akutelle Liste mit Erläuterungen unter: https://vlb.de/hilfe/lesemotive VLB-REST-API Spezifikation
80 / 85
 
 9.5.24. supportingResource - Mediendateien
Detailierte Angaben sind über die VLB-Hilfe unter Mediendateien abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Art der Mediendatei Zielgruppe
Medientyp
Art des Dateibezugs (Link, Download etc.) Namensnennung
Untertitel
Copyright
Copyright-Inhaber
ISNI des zugehörigen Contributors
Laufzeit
Dateiformat Bildhöhe
Bildbreite Dateiname Dateigröße in Mbyte Dateigröße in Byte
resourceContentType contentAudience
resourceMode resourceForm
credit
caption copyright copyrightHolder contributorIsni
duration fileFormat imageHeight imageWidth filename filesizeApprox filesizeExact
List 158 List 154
List 159 List 161
List 160 List 160 List 160 List 160 List 160
List 162 List 178 List 162 List 162 List 162 List 162 List 162
x436 type List 38 mediafile/ f114 x427
x437 - x441
x438=01; x440 x438=02; x440 x438=03; x440 x438=03; x439 x438=05; x440
x438=04; x439 x442=01; x439 x442=02; x439 x442=03; x439 x442=04; x439 x442=05; x439 x442=07; x439
                                                           Proprietäre ID des zugehörigen Contributors; bestenfalls entsprechend der Sequenznummer
  contributorSequenceNumber
    List 161
  x438=06; x441
                                                            VLB-REST-API Spezifikation
81 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 MD5 Hash Wert SHA256 Hash Wert Erstveröffentlichung Gültig von
Gültig bis
letzte Änderung
md5Hash sha256Hash publicationDate validFrom validUntil lastUpdated
List 162 List 162 List 155 List 155 List 155 List 155
x442=06; x439 x442=08; x439 x429=01; b306 x429=14/24; b306 x429=15/24; b306 x429=17; b306
d109 b324 b325 f373
                                      Externer Link 1
 exportedLink
    -
 x435
          mediafile/ f117 bzw. othertext/d106
9.5.25.
textContents - Zusatztexte
Detailierte Angaben sind über die VLB-Hilfe unter Zusatztexte abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Art des Zusatztextes Zielgruppe
Textformat
Text Autor 1 Autor 2
textType textContentAudience
textFormat
text textAuthor1 textAuthor2
List 153 List 154
List 34
- -
-
x426
x427
d104 – Attribut
textformat formatcode
d104
d107
d107
List 33 List 34
d102 -
d103
- -
type
                 Sprache
  language
    List 74
(ISO 639- 2/B)
  d104 mit language
   language
       d104 mit language
                      VLB-REST-API Spezifikation
82 / 85

   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Autor 3 Organisation Titel
veröffentlicht am gültig ab
gültig bis
zuletzt aktualisiert
9.5.26.
textAuthor3 textSourceCorporate sourceTitle
PublicationDate validFrom validUntil lastUpdated
titles – Titel und Produktsprache
- - -
List 155 List 155 List 155 List 155
d107
b374
x428
contentdate/ x429=01 b306
contentdate/ x429=14/24 b306 contentdate/ x429=15/24 b306 contentdate/ x429=17 b306
- - -
textPublication d109 Date
                            validFrom validUntil
b324 b325 -
                     Detailierte Angaben sind über die VLB-Hilfe unter Titel und Produktsprache abzurufen.
Entgegen dem ONIX 3.1 ist unter der REST-API ist die Produktsprache im Block 9.5.14 languages - Produktsprache abzurufen. Der Inhalt dieses Blockes ist wiederholbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Art des Titels Titel
Untertitel
titleType title subtitle
List 15
- -
b202
titleelement/ x409=01 b203
titleelement/ x409=01 b029
type title subtitle
List 15 b202 b203
b029
                     VLB-REST-API Spezifikation
83 / 85

 9.5.27. websites - Webseiten
Detailierte Angaben sind über die VLB-Hilfe unter Produktwebsite abzurufen.
Der Inhalt dieses Blockes ist wiederholbar.
Websites sind nur noch als Unterblock in ONIX 3.1 bzw. v2 der REST-API verfügbar.
   Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Art der Website Text zur Website Link zur Website
9.5.28.
websiteRole websiteDescription websiteLink
List 73 b367 type
- b294 description - b295 url
List 73 b367 b294 b295
                     wholesalers – Auslieferer- und Barsortimentssigel
Der Inhalt dieses Blockes ist wiederholbar.
Bestellnummer orderNumber - - orderNumber Sigelkennzeichen sigl - - sigl
  Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
               9.5.29.
productContacts – Kontaktadressen und Produktsicherheit
Detailierte Angaben sind über die VLB-Hilfe unter Kontaktadressen und Produktsicherheit abzurufen. VLB-REST-API Spezifikation 84 / 85
 
 Der Inhalt dieses Blockes ist wiederholbar.
  Element
   V2
   O3- Liste
   O3-Short
   V1
   O21- Liste
   O21-Short
 Art des Kontakts Organisation Person
Telefon
Mail
Straße, Hausnr.
Ort PLZ
type organization person
phone
mail streetAddress location postalCode
List 198 x482 - x484 - x299 - j270 - j272 - x552 - j349 - x590
                                                    Land
 country
    List 91
(ISO- 3166-1)
 b251
          VLB-REST-API Spezifikation
85 / 85
