import { useState, useEffect, useRef, useCallback } from "react";

// ── FORMSPREE - Envoi de réservation par email ───────────────────────────────
const FORMSPREE_URL = "https://formspree.io/f/mnjkjedp";

// Email à l'admin quand client réserve
const sendReservationEmail = async (data) => {
 try {
 const response = await fetch(FORMSPREE_URL, {
 method: "POST",
 headers: { 
 "Content-Type": "application/json",
 "Accept": "application/json"
 },
 body: JSON.stringify({
 "Nom complet": data.clientNom,
 "Âge": data.clientAge,
 "Téléphone": data.clientTel,
 "Email client": data.clientEmail,
 "Villa": data.villaName,
 "Date arrivée": data.checkIn,
 "Date départ": data.checkOut,
 "Voyageurs": data.guests,
 "Nuits": data.nights,
 "Total séjour": data.total,
 "Acompte à recevoir": data.deposit,
 "_subject": " Nouvelle réservation – " + data.villaName,
 "_replyto": data.clientEmail,
 })
 });
 const result = await response.json();
 return result.ok;
 } catch(e) {
 console.error("Formspree error:", e);
 return false;
 }
};

// Email de confirmation au client quand admin confirme
const sendConfirmationToClient = async (res) => {
 try {
 const response = await fetch(FORMSPREE_URL, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 "Accept": "application/json"
 },
 body: JSON.stringify({
 "Type": "CONFIRMATION DE RÉSERVATION",
 "Pour": res.clientEmail || "client",
 "Nom client": res.clientNom || res.villaName,
 "Villa": res.villaName,
 "Date arrivée": res.checkIn,
 "Date départ": res.checkOut,
 "Voyageurs": res.guests,
 "Total séjour": res.totalPrice + " €",
 "Acompte payé": res.deposit + " €",
 "Reste à payer": res.deposit + " €",
 "_subject": " Réservation confirmée – " + res.villaName + " | Villaselect",
 "_replyto": res.clientEmail || "adminvillaselect@gmail.com",
 "Message": "Bonjour " + (res.clientNom || "cher client") + ", votre réservation pour " + res.villaName + " du " + res.checkIn + " au " + res.checkOut + " est confirmée ! Le solde de " + res.deposit + " € sera à régler à l'arrivée. À bientôt ! – Villaselect",
 })
 });
 const result = await response.json();
 return result.ok;
 } catch(e) {
 console.error("Confirmation email error:", e);
 return false;
 }
};

// ── STRIPE PAYMENT LINK ───────────────────────────────────────────────────────
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/00w9AUd43eUvbcF4g7bfO00";

// Redirige vers Stripe Payment Link avec montant pré-rempli
// Le montant est passé en centimes dans l'URL
const redirectToStripe = async (deposit, villaName, checkIn, checkOut, guests) => {
 try {
 // Stripe Payment Links acceptent ?amount= pour les liens à montant variable
 const amountCents = Math.round(deposit * 100);
 const desc = encodeURIComponent(`${villaName} · ${checkIn} → ${checkOut} · ${guests} pers.`);
 // On utilise le Payment Link avec le montant en paramètre
 const url = `https://buy.stripe.com/00w9AUd43eUvbcF4g7bfO00?prefilled_quantity=1&client_reference_id=${desc}&amount=${amountCents}`;
 window.location.href = url;
 } catch(e) {
 alert("Erreur de connexion. Veuillez réessayer.");
 }
};

// ── STRIPE CONFIG ─────────────────────────────────────────────────────────────
// Remplacez cette clé par votre clé publique Stripe (Dashboard → Développeurs → Clés API)
const STRIPE_PUBLIC_KEY = "pk_test_REMPLACEZ_PAR_VOTRE_CLE_STRIPE";

// Simulation Stripe pour le mode test (remplacer par vrai Stripe.js en production)
const simulateStripePayment = async (amount, currency = "eur") => {
 return new Promise((resolve) => {
 setTimeout(() => resolve({ success: true, paymentIntentId: "pi_test_" + Date.now() }), 1800);
 });
};

// ── helpers ──────────────────────────────────────────────────────────────────
const formatPrice = (n) => n.toLocaleString("fr-FR") + " €";
const today = () => new Date().toISOString().split("T")[0];


// ── Card Brand SVG Logos ──────────────────────────────────────────────────────
const CardLogos = {
 Visa: ({ h=28 }) => (
 <svg height={h} viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
 <rect width="750" height="471" rx="40" fill="#1A1F71"/>
 <path d="M300 330L330 141H380L350 330H300Z" fill="white"/>
 <path d="M510 145C500 141 484 137 464 137C415 137 381 162 381 198C380 225 405 240 424 249C444 258 450 264 450 272C450 284 435 290 421 290C402 290 392 287 375 280L368 277L361 321C373 327 395 332 418 332C470 332 503 308 504 269C504 248 491 232 464 219C446 210 435 204 435 195C435 185 446 175 470 175C490 175 504 179 515 184L520 186L527 144L510 145Z" fill="white"/>
 <path d="M568 141H530C518 141 509 145 504 157L429 330H481L491 304H554L560 330H606L568 141ZM505 266C509 256 525 213 525 213C525 213 529 203 532 196L535 212C535 212 544 256 546 266H505Z" fill="white"/>
 <path d="M248 141L200 265L195 241C186 214 161 185 133 170L177 330H230L315 141H248Z" fill="white"/>
 <path d="M160 141H78L77 145C140 161 182 197 200 241L181 158C178 146 169 141 160 141Z" fill="#F9A533"/>
 </svg>
 ),
 Mastercard: ({ h=28 }) => (
 <svg height={h} viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg">
 <rect width="750" height="471" rx="40" fill="#252525"/>
 <circle cx="285" cy="235" r="150" fill="#EB001B"/>
 <circle cx="465" cy="235" r="150" fill="#F79E1B"/>
 <path d="M375 130C408 155 430 193 430 235C430 277 408 315 375 340C342 315 320 277 320 235C320 193 342 155 375 130Z" fill="#FF5F00"/>
 </svg>
 ),
 Amex: ({ h=28 }) => (
 <svg height={h} viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg">
 <rect width="750" height="471" rx="40" fill="#2557D6"/>
 <path d="M120 180H170L185 215L200 180H630V291L615 310L630 329V360H565L548 338L531 360H120V180Z" fill="#2557D6"/>
 <path d="M140 200V340H520V316L540 340H580L600 316V340H630V200H600L575 265L550 200H370V340H400V225L430 340H460L490 225V340H520V200H420L395 270L370 200H140ZM140 200L175 270L140 340" fill="white"/>
 <text x="140" y="295" fontFamily="Arial" fontWeight="900" fontSize="72" fill="white">AMERICAN</text>
 <text x="140" y="340" fontFamily="Arial" fontWeight="900" fontSize="52" fill="white">EXPRESS</text>
 </svg>
 ),
 CarteBleue: ({ h=28 }) => (
 <svg height={h} viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg">
 <rect width="750" height="471" rx="40" fill="#005BAC"/>
 <circle cx="375" cy="235" r="130" fill="none" stroke="white" strokeWidth="20"/>
 <path d="M305 235 H445 M375 165 V305" stroke="white" strokeWidth="20" strokeLinecap="round"/>
 <text x="375" y="390" fontFamily="Arial" fontWeight="700" fontSize="48" fill="white" textAnchor="middle">CB</text>
 </svg>
 ),
};

// ── mock data ─────────────────────────────────────────────────────────────────
const INITIAL_VILLAS = [
 {
 id: 1, name: "Villa Soleil d'Or", city: "Cannes", price: 350,
 bedrooms: 4, bathrooms: 3, capacity: 8,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Magnifique villa avec vue mer panoramique à Cannes, piscine chauffée, terrasse xxl et jardin privatif. Idéale pour familles ou groupes d'amis.",
 photos: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"]
 },
 {
 id: 2, name: "Villa Méditerranée", city: "Nice", price: 180,
 bedrooms: 3, bathrooms: 2, capacity: 6,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Superbe villa avec piscine privée à 10 min de la Promenade des Anglais. Vue imprenable sur la mer, jardin fleuri, climatisation dans toutes les pièces.",
 photos: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"]
 },
 {
 id: 3, name: "Villa Les Pins", city: "Saint-Tropez", price: 610,
 bedrooms: 6, bathrooms: 4, capacity: 12,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Demeure de prestige au cœur des pins de Saint-Tropez. Piscine à débordement, grand salon avec cheminée, terrasse panoramique sur la baie.",
 photos: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"]
 },
 {
 id: 4, name: "Mas Provençal", city: "Aix-en-Provence", price: 240,
 bedrooms: 3, bathrooms: 2, capacity: 6,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Authentique mas provençal du XVIIIe siècle avec oliviers centenaires, piscine chauffée et vue sur le Mont Sainte-Victoire. Calme absolu.",
 photos: ["https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"]
 },
 {
 id: 5, name: "Villa Côte Bleue", city: "Marseille", price: 220,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Villa moderne face aux calanques de Marseille, piscine avec vue mer, accès direct à la plage privée. Décoration contemporaine haut de gamme.",
 photos: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80","https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80"]
 },
 {
 id: 6, name: "Bastide du Luberon", city: "Gordes", price: 280,
 bedrooms: 5, bathrooms: 3, capacity: 10,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Splendide bastide en pierre au cœur du Luberon, vue sur les champs de lavande, piscine chauffée, grand terrain arboré. Village de Gordes à 5 min.",
 photos: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"]
 },
 {
 id: 7, name: "Villa Azur", city: "Antibes", price: 320,
 bedrooms: 4, bathrooms: 3, capacity: 8,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Villa luxueuse à Antibes avec piscine chauffée, jardin méditerranéen, terrasse avec vue sur mer. À 5 min des plages et du vieil Antibes.",
 photos: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80","https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"]
 },
 {
 id: 8, name: "Maison des Vignes", city: "Bordeaux", price: 160,
 bedrooms: 3, bathrooms: 2, capacity: 6,
 wifi: true, ac: false, pool: true, parking: true, available: true,
 description: "Charmante maison entourée de vignes bordelaises, piscine privée, cave à vin, vélos disponibles. Idéale pour découvrir les châteaux de la région.",
 photos: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80","https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80"]
 },
 {
 id: 9, name: "Villa Basque", city: "Biarritz", price: 270,
 bedrooms: 4, bathrooms: 3, capacity: 8,
 wifi: true, ac: false, pool: true, parking: true, available: true,
 description: "Belle villa de style basque à Biarritz, piscine chauffée, terrasse avec vue sur l'océan Atlantique. Plage Grande Côte à 10 min à pied.",
 photos: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80","https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80"]
 },
 {
 id: 10, name: "Villa Corse du Sud", city: "Porto-Vecchio", price: 390,
 bedrooms: 5, bathrooms: 3, capacity: 10,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Villa d'exception en Corse du Sud, piscine à débordement sur la mer, plage de Palombaggia à 5 min, jardin tropical luxuriant. Vue mer imprenable.",
 photos: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"]
 },
 {
 id: 11, name: "Chalet Alpin", city: "Chamonix", price: 310,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: false, pool: false, parking: true, available: true,
 description: "Magnifique chalet en bois face au Mont-Blanc, jacuzzi extérieur, sauna, cheminée. Idéal été comme hiver pour profiter des montagnes.",
 photos: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80","https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"]
 },
 {
 id: 12, name: "Villa Belle Époque", city: "Deauville", price: 230,
 bedrooms: 4, bathrooms: 3, capacity: 8,
 wifi: true, ac: false, pool: false, parking: true, available: true,
 description: "Villa normande de caractère à Deauville, jardin fleuri, grande terrasse, à 5 min des planches et des célèbres plages normandes.",
 photos: ["https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"]
 },
 {
 id: 13, name: "Villa Languedoc", city: "Montpellier", price: 175,
 bedrooms: 3, bathrooms: 2, capacity: 6,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Jolie villa avec piscine privée à 15 min de Montpellier et 20 min des plages de la Grande-Motte. Jardin avec barbecue, idéale en famille.",
 photos: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"]
 },
 {
 id: 14, name: "Maison Bretonne", city: "Quiberon", price: 145,
 bedrooms: 3, bathrooms: 1, capacity: 6,
 wifi: true, ac: false, pool: false, parking: true, available: true,
 description: "Authentique maison bretonne à Quiberon, jardin avec accès direct à la mer, terrasse ensoleillée. Idéale pour séjour nature et randonnée.",
 photos: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80","https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80"]
 },
 {
 id: 15, name: "Villa Tropézienne", city: "Ramatuelle", price: 520,
 bedrooms: 5, bathrooms: 4, capacity: 10,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Villa de standing à Ramatuelle, à 2 km des plages de Pampelonne, piscine chauffée, cuisine extérieure, vue sur les vignes et la mer.",
 photos: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80","https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80"]
 },
 {
 id: 16, name: "Domaine du Verdon", city: "Moustiers-Sainte-Marie", price: 195,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Domaine provençal aux portes des gorges du Verdon, piscine naturelle, jardin arboré de 2 hectares, vue sur les falaises. Calme et sérénité garantis.",
 photos: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"]
 },
 {
 id: 17, name: "Villa Cap Ferret", city: "Cap Ferret", price: 285,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: false, pool: false, parking: true, available: true,
 description: "Superbe villa en bois au Cap Ferret, face au bassin d'Arcachon, terrasse sur pilotis, embarcadère privé. Vue panoramique sur la dune du Pilat.",
 photos: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80","https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80"]
 },
 {
 id: 18, name: "Villa Riviera", city: "Menton", price: 260,
 bedrooms: 3, bathrooms: 2, capacity: 6,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Villa italianisante à Menton avec piscine privée, jardins en terrasses avec citronniers, vue mer exceptionnelle. À 2 km de l'Italie.",
 photos: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"]
 },
 {
 id: 19, name: "Mas du Roussillon", city: "Perpignan", price: 155,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Mas catalan avec piscine à débordement, vue sur les Pyrénées, jardin avec palmiers et oliviers. Plages de Canet à 15 min, Espagne à 30 min.",
 photos: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"]
 },
 {
 id: 20, name: "Villa Côte d'Opale", city: "Le Touquet", price: 165,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: false, pool: false, parking: true, available: true,
 description: "Belle villa anglo-normande au Touquet, à 5 min de la plage, jardin avec barbecue, sauna intérieur. Idéale pour week-ends en famille ou entre amis.",
 photos: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80","https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"]
 },
 {
 id: 21, name: "Villa Dordogne", city: "Sarlat-la-Canéda", price: 175,
 bedrooms: 5, bathrooms: 3, capacity: 10,
 wifi: true, ac: false, pool: true, parking: true, available: true,
 description: "Magnifique maison périgourdine en pierre avec piscine privée, grande terrasse ombragée. Au cœur du Périgord Noir, à 5 min de Sarlat.",
 photos: ["https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80","https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80"]
 },
 {
 id: 22, name: "Bastide Aixoise", city: "Aix-en-Provence", price: 290,
 bedrooms: 5, bathrooms: 3, capacity: 10,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Élégante bastide du XVIIe siècle restaurée avec goût, piscine chauffée, cuisine provençale entièrement équipée, grand parc arboré de 3 hectares.",
 photos: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"]
 },
 {
 id: 23, name: "Villa Bord de Mer", city: "La Rochelle", price: 195,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: false, pool: false, parking: true, available: true,
 description: "Villa contemporaine face à l'océan Atlantique à La Rochelle, grande terrasse vue mer, jardin clos. À 5 min du Vieux-Port et des îles.",
 photos: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80","https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80"]
 },
 {
 id: 24, name: "Château de Campagne", city: "Tours", price: 340,
 bedrooms: 6, bathrooms: 4, capacity: 12,
 wifi: true, ac: false, pool: true, parking: true, available: true,
 description: "Petit château de la Loire avec piscine, parc de 5 hectares, orangerie. Décoration d'époque raffinée, à 15 min des plus beaux châteaux de la Loire.",
 photos: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80","https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80"]
 },
 {
 id: 25, name: "Villa Camargue", city: "Saintes-Maries-de-la-Mer", price: 185,
 bedrooms: 3, bathrooms: 2, capacity: 6,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Villa de charme en pleine Camargue, piscine privée, chevaux en liberté à proximité, flamants roses visibles depuis la terrasse. Nature préservée.",
 photos: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"]
 },
 {
 id: 26, name: "Villa Alsacienne", city: "Colmar", price: 140,
 bedrooms: 3, bathrooms: 2, capacity: 6,
 wifi: true, ac: false, pool: false, parking: true, available: true,
 description: "Charmante maison alsacienne à colombages à Colmar, jardin fleuri, cave à vins, idéale pour découvrir la Route des Vins d'Alsace et ses marchés.",
 photos: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80","https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80"]
 },
 {
 id: 27, name: "Villa Île de Ré", city: "Saint-Martin-de-Ré", price: 265,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: false, pool: true, parking: true, available: true,
 description: "Villa de charme sur l'Île de Ré, piscine chauffée, jardin avec oliviers et lavande, vélos fournis. À 5 min des plages et des vignes de l'île.",
 photos: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"]
 },
 {
 id: 28, name: "Mas des Alpilles", city: "Les Baux-de-Provence", price: 310,
 bedrooms: 4, bathrooms: 3, capacity: 8,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Mas provençal de prestige au pied des Alpilles, piscine chauffée, oliveraie centenaire, terrasse panoramique. Village des Baux-de-Provence à 2 km.",
 photos: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80","https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"]
 },
 {
 id: 29, name: "Villa Landaise", city: "Hossegor", price: 235,
 bedrooms: 4, bathrooms: 2, capacity: 8,
 wifi: true, ac: false, pool: true, parking: true, available: true,
 description: "Belle villa landaise à Hossegor, piscine chauffée, jardin de pins, à 10 min des plages de surf. Style contemporain avec matériaux naturels.",
 photos: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"]
 },
 {
 id: 30, name: "Villa Corse du Nord", city: "Calvi", price: 345,
 bedrooms: 4, bathrooms: 3, capacity: 8,
 wifi: true, ac: true, pool: true, parking: true, available: true,
 description: "Villa exceptionnelle à Calvi avec piscine à débordement sur la mer, accès direct à la plage, jardin tropical. Vue sur la citadelle génoise.",
 photos: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80","https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80"]
 },
];

const INITIAL_REVIEWS = [
 { id: 1, author: "Marie L.", rating: 5, date: "2024-07-15", text: "Séjour absolument parfait ! La villa était magnifique et l'équipe très réactive. Nous reviendrons sans hésiter.", villa: "Villa Soleil d'Or" },
 { id: 2, author: "Pierre M.", rating: 5, date: "2024-08-03", text: "Appartement exactement comme sur les photos, très bien situé. Service impeccable.", villa: "Appartement Azure" },
 { id: 3, author: "Sophie D.", rating: 4, date: "2024-06-20", text: "Très belle propriété, piscine superbe. Quelques petits détails à améliorer mais globalement excellent.", villa: "Villa Les Pins" },
 { id: 4, author: "Jean-Paul B.", rating: 5, date: "2024-09-10", text: "Villaselect est une vraie pépite ! Sélection de qualité, réservation simple, rien à redire.", villa: "Villa Soleil d'Or" },
];

const INITIAL_RESERVATIONS = [
 { id: 1, userId: 2, villaId: 1, villaName: "Villa Soleil d'Or", checkIn: "2025-07-10", checkOut: "2025-07-24", guests: 6, totalPrice: 5880, deposit: 2940, status: "confirmed" },
 { id: 2, userId: 2, villaId: 2, villaName: "Appartement Azure", checkIn: "2025-08-01", checkOut: "2025-08-15", guests: 3, totalPrice: 2520, deposit: 1260, status: "pending" },
];

const INITIAL_USERS = [
 { id: 1, email: "admin@villaselect.com", password: "admin123", name: "Administrateur", role: "admin", confirmed: true },
 { id: 2, email: "user@demo.com", password: "demo123", name: "Jean Dupont", role: "user", confirmed: true },
];

// ── icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
 const icons = {
 search: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
 wifi: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
 ac: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 17v2M10 17v2M14 17v2M18 17v2M8 11h8"/></svg>,
 pool: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 12c.5-1 1.5-1 2-.5s1.5 1.5 2 .5 1.5-1 2-.5 1.5 1.5 2 .5 1.5-1 2-.5 1.5 1.5 2 .5"/><path d="M2 17c.5-1 1.5-1 2-.5s1.5 1.5 2 .5 1.5-1 2-.5 1.5 1.5 2 .5 1.5-1 2-.5 1.5 1.5 2 .5"/><path d="M14 7c0-1.1.9-2 2-2s2 .9 2 2"/><path d="M14 7v5"/><path d="M18 7v5"/></svg>,
 parking: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>,
 bed: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 9V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v5"/><path d="M2 20v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="M2 15h20"/><path d="M9 9h6"/></svg>,
 bath: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" y1="5" x2="8" y2="7"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
 users: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
 star: <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
 close: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
 menu: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
 plus: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
 edit: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
 trash: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
 check: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
 location: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
 mail: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
 phone: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.47 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.74a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
 home: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
 calendar: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
 arrow: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
 logout: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
 shield: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
 };
 return icons[name] || null;
};

// ── Stars ─────────────────────────────────────────────────────────────────────
const Stars = ({ rating, size = 16 }) => (
 <span style={{ display: "flex", gap: 2 }}>
 {[1,2,3,4,5].map(i => (
 <span key={i} style={{ color: i <= rating ? "#F28C38" : "#ddd" }}>
 <Icon name="star" size={size} />
 </span>
 ))}
 </span>
);

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, wide }) => {
 if (!open) return null;
 return (
 <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
 <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth: wide ? 800 : 520, maxHeight:"90vh", overflowY:"auto", padding:28 }} onClick={e => e.stopPropagation()}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
 <h2 style={{ margin:0, fontFamily:"Montserrat,sans-serif", color:"#5A2E0C", fontSize:20 }}>{title}</h2>
 <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}><Icon name="close" /></button>
 </div>
 {children}
 </div>
 </div>
 );
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type }) => {
 if (!msg) return null;
 const bg = type === "error" ? "#e53e3e" : "#38a169";
 return (
 <div style={{ position:"fixed", bottom:24, right:24, background:bg, color:"#fff", padding:"12px 20px", borderRadius:10, zIndex:2000, fontFamily:"Poppins,sans-serif", fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,.2)" }}>
 {msg}
 </div>
 );
};

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
// Remplacez ces deux valeurs par celles de votre projet Supabase
// Settings → API → Project URL et anon public key
const SUPABASE_URL = "https://qpkwyapqgtcgeanxvjrb.supabase.co";
const SUPABASE_ANON = "sb_publishable_G3kbKN-kMA6Tc3x40aFFUg_8z6-VtYF";

// Client Supabase léger (sans SDK, juste fetch)
const sb = {
 from: (table) => ({
 select: async (cols = "*") => {
 const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}`, {
 headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
 });
 return r.ok ? { data: await r.json(), error: null } : { data: [], error: await r.json() };
 },
 insert: async (rows) => {
 const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
 method: "POST",
 headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=representation" },
 body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
 });
 return r.ok ? { data: await r.json(), error: null } : { data: null, error: await r.json() };
 },
 update: async (values, match) => {
 const params = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join("&");
 const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
 method: "PATCH",
 headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=representation" },
 body: JSON.stringify(values)
 });
 return r.ok ? { data: await r.json(), error: null } : { data: null, error: await r.json() };
 },
 delete: async (match) => {
 const params = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join("&");
 const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
 method: "DELETE",
 headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
 });
 return r.ok ? { error: null } : { error: await r.json() };
 },
 })
};

// Session locale (juste pour l'onglet courant)
const LS_SESSION = "villaselect_session";
const loadSession = () => { try { const s = localStorage.getItem(LS_SESSION); return s ? JSON.parse(s) : null; } catch(e) { return null; } };
const saveSession = (u) => { try { u ? localStorage.setItem(LS_SESSION, JSON.stringify(u)) : localStorage.removeItem(LS_SESSION); } catch(e) {} };

// Fallback si Supabase non configuré
const supabaseReady = () => SUPABASE_URL !== "VOTRE_PROJECT_URL" && SUPABASE_ANON !== "VOTRE_ANON_KEY";

// ── ──────────────────────────── MAIN APP ──────────────────────────────── ──
export default function App() {
 const [page, setPage] = useState("home");
 const [villas, setVillas] = useState(INITIAL_VILLAS);
 const [reviews, setReviews] = useState(INITIAL_REVIEWS);
 const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);
 const [users, setUsers] = useState(INITIAL_USERS);
 const [currentUser, setCurrentUser] = useState(loadSession);
 const [dbLoading, setDbLoading] = useState(true);
 const [toast, setToast] = useState({ msg:"", type:"success" });
 const [mobileMenu, setMobileMenu] = useState(false);
 const [searchFilters, setSearchFilters] = useState({ destination:"", checkIn:"", checkOut:"", guests:1 });

 // ── Chargement initial depuis Supabase + localStorage fallback ──
 useEffect(() => {
 const load = async () => {
 // Charger depuis localStorage d'abord
 try {
 const localUsers = localStorage.getItem("vs_users");
 const localRes = localStorage.getItem("vs_reservations");
 if (localUsers) {
 const parsed = JSON.parse(localUsers);
 const merged = [...INITIAL_USERS];
 parsed.forEach(u => { if (!merged.find(x => x.email === u.email)) merged.push(u); });
 setUsers(merged);
 }
 if (localRes) {
 const parsed = JSON.parse(localRes);
 const merged = [...INITIAL_RESERVATIONS];
 parsed.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });
 setReservations(merged);
 }
 } catch(e) { console.error("localStorage error:", e); }

 // Puis synchroniser avec Supabase
 if (!supabaseReady()) { setDbLoading(false); return; }
 try {
 const { data: dbUsers } = await sb.from("users").select("*");
 if (dbUsers && dbUsers.length > 0) {
 const merged = [...INITIAL_USERS];
 dbUsers.forEach(u => { if (!merged.find(x => x.email === u.email)) merged.push(u); });
 setUsers(merged);
 localStorage.setItem("vs_users", JSON.stringify(merged));
 }
 const { data: dbRes } = await sb.from("reservations").select("*");
 if (dbRes && dbRes.length > 0) {
 const merged = [...INITIAL_RESERVATIONS];
 dbRes.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });
 setReservations(merged);
 localStorage.setItem("vs_reservations", JSON.stringify(merged));
 }
 } catch(e) { console.error("Supabase load error:", e); }
 setDbLoading(false);
 };
 load();
 }, []);

 // ── Sauvegarde users dans Supabase ──
 const saveUserToDB = async (user) => {
 // Sauvegarder dans localStorage immédiatement
 try {
 const existing = JSON.parse(localStorage.getItem("vs_users") || "[]");
 if (!existing.find(u => u.email === user.email)) {
 existing.push(user);
 localStorage.setItem("vs_users", JSON.stringify(existing));
 }
 } catch(e) { console.error("localStorage user save error:", e); }
 // Puis dans Supabase
 if (!supabaseReady()) return;
 try { await sb.from("users").insert(user); } catch(e) { console.error(e); }
 };

 // ── Sauvegarde réservation dans Supabase ──
 const saveReservationToDB = async (res) => {
 // Sauvegarder dans localStorage immédiatement
 try {
 const existing = JSON.parse(localStorage.getItem("vs_reservations") || "[]");
 if (!existing.find(r => r.id === res.id)) {
 existing.push(res);
 localStorage.setItem("vs_reservations", JSON.stringify(existing));
 }
 } catch(e) { console.error("localStorage save error:", e); }
 // Puis dans Supabase
 if (!supabaseReady()) return;
 try { await sb.from("reservations").insert(res); } catch(e) { console.error(e); }
 };

 // ── Mise à jour statut réservation ──
 const updateReservationInDB = async (id, values) => {
 if (!supabaseReady()) return;
 try { await sb.from("reservations").update(values, { id }); } catch(e) { console.error(e); }
 };

 // Détecter le retour de Stripe avec succès ou annulation
 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const payment = params.get("payment");
 if (payment === "success") {
 // Marquer la dernière réservation pending comme confirmée
 setReservations(prev => {
 const lastPending = [...prev].reverse().find(r => r.status === "pending");
 if (lastPending) {
 updateReservationInDB(lastPending.id, { status: "confirmed" });
 return prev.map(r => r.id === lastPending.id ? {...r, status:"confirmed"} : r);
 }
 return prev;
 });
 showToast(" Paiement confirmé ! Votre réservation est validée.");
 window.history.replaceState({}, "", window.location.pathname);
 nav("reservations");
 } else if (payment === "cancel") {
 showToast("Paiement annulé. Votre réservation reste en attente.", "error");
 window.history.replaceState({}, "", window.location.pathname);
 }
 }, []);

 const showToast = (msg, type="success") => {
 setToast({ msg, type });
 setTimeout(() => setToast({ msg:"", type:"success" }), 3500);
 };

 const nav = (p) => { setPage(p); setMobileMenu(false); window.scrollTo(0,0); };

 const logout = () => {
 saveSession(null);
 setCurrentUser(null);
 nav("home");
 showToast("Déconnexion réussie.");
 };


 const navItems = [
 { id:"home", label:"Accueil" },
 { id:"locations", label:"Nos Locations" },
 { id:"reservations", label:"Réservations", auth: true },
 { id:"contact", label:"Contact" },
 ];

 if (dbLoading) return (
 <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#fff8f3", fontFamily:"Poppins,sans-serif" }}>
 <div style={{ width:64, height:64, background:"linear-gradient(135deg,#F28C38,#5A2E0C)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
 <span style={{ color:"#fff", fontFamily:"Montserrat,sans-serif", fontWeight:900, fontSize:28 }}>V</span>
 </div>
 <p style={{ color:"#5A2E0C", fontWeight:600, fontSize:16, marginBottom:8 }}>Chargement de Villaselect...</p>
 <div style={{ display:"flex", gap:6 }}>
 {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#F28C38", animation:`bounce 0.8s ${i*0.2}s infinite alternate` }} />)}
 </div>
 <style>{`@keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-8px)}}`}</style>
 </div>
 );

 return (
 <div style={{ fontFamily:"Poppins,sans-serif", color:"#1a1a1a", minHeight:"100vh", background:"#fafafa" }}>
 <style>{`
 @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@600;700;800;900&display=swap');
 *{box-sizing:border-box;margin:0;padding:0}
 html{scroll-behavior:smooth}
 input,textarea,select{font-family:inherit}
 button{font-family:inherit;cursor:pointer}
 .btn-primary{background:#F28C38;color:#fff;border:none;padding:12px 28px;border-radius:50px;font-weight:600;font-size:15px;transition:.2s;letter-spacing:.3px}
 .btn-primary:hover{background:#d97720;transform:translateY(-1px);box-shadow:0 6px 20px rgba(242,140,56,.4)}
 .btn-outline{background:transparent;color:#F28C38;border:2px solid #F28C38;padding:10px 24px;border-radius:50px;font-weight:600;font-size:14px;transition:.2s}
 .btn-outline:hover{background:#F28C38;color:#fff}
 .btn-dark{background:#5A2E0C;color:#fff;border:none;padding:10px 22px;border-radius:50px;font-weight:600;font-size:14px;transition:.2s}
 .btn-dark:hover{background:#3d1f07;transform:translateY(-1px)}
 .btn-sm{padding:8px 18px !important;font-size:13px !important}
 .input{width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;transition:.2s;background:#fff}
 .input:focus{border-color:#F28C38;box-shadow:0 0 0 3px rgba(242,140,56,.15)}
 .card{background:#fff;border-radius:16px;box-shadow:0 2px 16px rgba(0,0,0,.07);overflow:hidden;transition:.2s}
 .card:hover{box-shadow:0 8px 30px rgba(0,0,0,.12);transform:translateY(-2px)}
 .badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}
 .badge-green{background:#e6f4ea;color:#276749}
 .badge-red{background:#fde8e8;color:#c53030}
 .badge-orange{background:#fff3e0;color:#e65100}
 .badge-blue{background:#e8f0fe;color:#1a56db}
 @media(max-width:768px){
 .hide-mobile{display:none!important}
 .grid-villas{grid-template-columns:1fr!important}
 }
 `}</style>

 {/* NAV */}
 <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(255,255,255,.96)", backdropFilter:"blur(12px)", borderBottom:"1px solid #f0e8e0", padding:"0 24px" }}>
 <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:68 }}>
 <button onClick={() => nav("home")} style={{ background:"none", border:"none", display:"flex", alignItems:"center", gap:10 }}>
 <div style={{ width:40, height:40, background:"linear-gradient(135deg,#F28C38,#5A2E0C)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
 <span style={{ color:"#fff", fontFamily:"Montserrat,sans-serif", fontWeight:900, fontSize:18 }}>V</span>
 </div>
 <span style={{ fontFamily:"Montserrat,sans-serif", fontWeight:800, fontSize:20, color:"#5A2E0C", letterSpacing:"-0.5px" }}>Villa<span style={{ color:"#F28C38" }}>select</span></span>
 </button>
 <div className="hide-mobile" style={{ display:"flex", gap:4, alignItems:"center" }}>
 {navItems.map(item => (
 (!item.auth || currentUser) && (
 <button key={item.id} onClick={() => nav(item.id)} style={{ background:"none", border:"none", padding:"8px 16px", borderRadius:8, fontWeight:500, fontSize:14, color: page===item.id ? "#F28C38" : "#444", transition:".2s", fontFamily:"Poppins,sans-serif" }}>
 {item.label}
 </button>
 )
 ))}
 {currentUser?.role === "admin" && (
 <button onClick={() => nav("admin")} style={{ background:"none", border:"none", padding:"8px 16px", borderRadius:8, fontWeight:600, fontSize:14, color: page==="admin" ? "#5A2E0C" : "#888", fontFamily:"Poppins,sans-serif" }}>
 Admin
 </button>
 )}
 </div>
 <div style={{ display:"flex", gap:8, alignItems:"center" }}>
 {currentUser ? (
 <div className="hide-mobile" style={{ display:"flex", alignItems:"center", gap:10 }}>
 <span style={{ fontSize:13, color:"#666" }}>Bonjour, <strong>{currentUser.name.split(" ")[0]}</strong></span>
 <button className="btn-outline btn-sm" onClick={logout} style={{ display:"flex", alignItems:"center", gap:6 }}>
 <Icon name="logout" size={14} /> Sortir
 </button>
 </div>
 ) : (
 <div className="hide-mobile" style={{ display:"flex", gap:8 }}>
 <button className="btn-outline btn-sm" onClick={() => nav("login")}>Connexion</button>
 <button className="btn-primary btn-sm" onClick={() => nav("register")}>S'inscrire</button>
 </div>
 )}
 <button style={{ background:"none", border:"none", padding:8 }} onClick={() => setMobileMenu(!mobileMenu)}>
 <Icon name="menu" size={24} />
 </button>
 </div>
 </div>
 {/* mobile menu */}
 {mobileMenu && (
 <div style={{ borderTop:"1px solid #f0e8e0", padding:"12px 0", background:"#fff" }}>
 {navItems.map(item => (
 (!item.auth || currentUser) && (
 <button key={item.id} onClick={() => nav(item.id)} style={{ display:"block", width:"100%", textAlign:"left", padding:"12px 24px", background:"none", border:"none", fontWeight:500, color:"#444", fontFamily:"Poppins,sans-serif" }}>
 {item.label}
 </button>
 )
 ))}
 {!currentUser && (
 <div style={{ padding:"8px 24px", display:"flex", gap:8 }}>
 <button className="btn-outline btn-sm" onClick={() => nav("login")}>Connexion</button>
 <button className="btn-primary btn-sm" onClick={() => nav("register")}>S'inscrire</button>
 </div>
 )}
 {currentUser && (
 <div style={{ padding:"8px 24px" }}>
 <button className="btn-outline btn-sm" onClick={logout}>Déconnexion</button>
 </div>
 )}
 </div>
 )}
 </nav>

 {/* PAGES */}
 {page === "home" && <HomePage villas={villas} reviews={reviews} nav={nav} searchFilters={searchFilters} setSearchFilters={setSearchFilters} />}
 {page === "locations" && <LocationsPage villas={villas} reviews={reviews} searchFilters={searchFilters} nav={nav} currentUser={currentUser} showToast={showToast} reservations={reservations} setReservations={setReservations} saveReservationToDB={saveReservationToDB} />}
 {page === "reservations" && currentUser && <ReservationsPage reservations={reservations.filter(r => currentUser.role === "admin" || r.userId === currentUser.id)} currentUser={currentUser} setReservations={setReservations} showToast={showToast} updateReservationInDB={updateReservationInDB} />}
 {page === "contact" && <ContactPage showToast={showToast} />}
 {page === "login" && <LoginPage users={users} setCurrentUser={setCurrentUser} nav={nav} showToast={showToast} />}
 {page === "register" && <RegisterPage users={users} setUsers={setUsers} nav={nav} showToast={showToast} saveUserToDB={saveUserToDB} />}
 {page === "admin" && currentUser?.role === "admin" && <AdminPage villas={villas} setVillas={setVillas} reservations={reservations} setReservations={setReservations} users={users} setUsers={setUsers} showToast={showToast} reviews={reviews} setReviews={setReviews} />}

 {/* Footer */}
 <footer style={{ background:"#5A2E0C", color:"#fff", padding:"48px 24px 24px" }}>
 <div style={{ maxWidth:1200, margin:"0 auto" }}>
 <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:32, marginBottom:32 }}>
 <div>
 <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
 <div style={{ width:36, height:36, background:"#F28C38", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
 <span style={{ color:"#fff", fontFamily:"Montserrat,sans-serif", fontWeight:900, fontSize:16 }}>V</span>
 </div>
 <span style={{ fontFamily:"Montserrat,sans-serif", fontWeight:800, fontSize:18 }}>Villa<span style={{ color:"#F28C38" }}>select</span></span>
 </div>
 <p style={{ fontSize:13, lineHeight:1.7, opacity:.8 }}>Votre sélection exclusive de villas et appartements pour des vacances inoubliables.</p>
 </div>
 <div>
 <h4 style={{ fontFamily:"Montserrat,sans-serif", marginBottom:14, fontSize:15 }}>Navigation</h4>
 {["home","locations","contact"].map(p => (
 <button key={p} onClick={() => nav(p)} style={{ display:"block", background:"none", border:"none", color:"rgba(255,255,255,.75)", fontSize:13, padding:"4px 0", textTransform:"capitalize", cursor:"pointer" }}>
 {p === "home" ? "Accueil" : p === "locations" ? "Nos Locations" : "Contact"}
 </button>
 ))}
 </div>
 <div>
 <h4 style={{ fontFamily:"Montserrat,sans-serif", marginBottom:14, fontSize:15 }}>Contact</h4>
 <p style={{ fontSize:13, opacity:.8, lineHeight:2 }}>
 adminvillaselect@gmail.com<br/>
 Lun–Dim, 9h–20h
 </p>
 </div>
 <div>
 <h4 style={{ fontFamily:"Montserrat,sans-serif", marginBottom:14, fontSize:15 }}>Paiement</h4>
 <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
 {[CardLogos.Visa, CardLogos.Mastercard, CardLogos.Amex, CardLogos.CarteBleue].map((Logo, i) => (
 <div key={i} style={{ background:"rgba(255,255,255,.12)", borderRadius:6, padding:"4px 8px", display:"flex", alignItems:"center" }}>
 <Logo h={18} />
 </div>
 ))}
 </div>
 <p style={{ fontSize:12, opacity:.7, lineHeight:1.8 }}>
 SSL · 3D Secure<br/>
 Acompte 50% · Séjour min. 7 nuits
 </p>
 </div>
 </div>
 <div style={{ borderTop:"1px solid rgba(255,255,255,.15)", paddingTop:16, textAlign:"center", fontSize:12, opacity:.6 }}>
 © 2025 Villaselect – Tous droits réservés
 </div>
 </div>
 </footer>

 <Toast {...toast} />


 </div>
 );
}

// ══════════════════════════════ HOME PAGE ══════════════════════════════════════
function HomePage({ villas, reviews, nav, searchFilters, setSearchFilters }) {
 const featuredVillas = villas.filter(v => v.available).slice(0, 3);
 const handleSearch = () => nav("locations");

 return (
 <div>
 {/* HERO */}
 <section style={{ minHeight:"88vh", background:"linear-gradient(135deg,#5A2E0C 0%,#8B4513 40%,#F28C38 100%)", position:"relative", display:"flex", alignItems:"center", overflow:"hidden" }}>
 <div style={{ position:"absolute", inset:0, backgroundImage:"url('https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80')", backgroundSize:"cover", backgroundPosition:"center", opacity:.22 }} />
 <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(90,46,12,.85) 0%,rgba(242,140,56,.3) 100%)" }} />
 <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"80px 24px", textAlign:"center", width:"100%" }}>
 <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.15)", backdropFilter:"blur(10px)", padding:"8px 18px", borderRadius:50, marginBottom:24 }}>
 <span style={{ color:"#F28C38", fontSize:14 }}> </span>
 <span style={{ color:"#fff", fontSize:13, fontWeight:500 }}>+200 villas & appartements sélectionnés</span>
 </div>
 <h1 style={{ fontFamily:"Montserrat,sans-serif", fontSize:"clamp(32px,6vw,72px)", fontWeight:900, color:"#fff", lineHeight:1.1, marginBottom:20, letterSpacing:"-1px" }}>
 Trouvez la villa idéale<br /><span style={{ color:"#F28C38" }}>pour vos vacances</span>
 </h1>
 <p style={{ fontSize:"clamp(15px,2vw,19px)", color:"rgba(255,255,255,.85)", maxWidth:600, margin:"0 auto 40px", lineHeight:1.7 }}>
 Découvrez une sélection exclusive de villas et appartements confortables pour vos séjours en famille, entre amis ou en couple.
 </p>
 {/* Search Bar */}
 <div style={{ background:"#fff", borderRadius:20, padding:20, maxWidth:860, margin:"0 auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
 <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, alignItems:"end" }}>
 <div>
 <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5A2E0C", marginBottom:6 }}> Destination</label>
 <input className="input" placeholder="Où souhaitez-vous aller ?" value={searchFilters.destination} onChange={e => setSearchFilters(p => ({...p, destination:e.target.value}))} />
 </div>
 <div>
 <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5A2E0C", marginBottom:6 }}> Arrivée</label>
 <input className="input" type="date" min={today()} value={searchFilters.checkIn} onChange={e => setSearchFilters(p => ({...p, checkIn:e.target.value}))} />
 </div>
 <div>
 <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5A2E0C", marginBottom:6 }}> Départ</label>
 <input className="input" type="date" min={searchFilters.checkIn || today()} value={searchFilters.checkOut} onChange={e => setSearchFilters(p => ({...p, checkOut:e.target.value}))} />
 </div>
 <div>
 <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5A2E0C", marginBottom:6 }}> Voyageurs</label>
 <input className="input" type="number" min={1} max={20} value={searchFilters.guests} onChange={e => setSearchFilters(p => ({...p, guests:e.target.value}))} />
 </div>
 <button className="btn-primary" onClick={handleSearch} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, height:48 }}>
 <Icon name="search" size={18} /> Rechercher
 </button>
 </div>
 </div>
 </div>
 {/* wave */}
 <div style={{ position:"absolute", bottom:0, left:0, right:0 }}>
 <svg viewBox="0 0 1440 80" fill="#fafafa"><path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"/></svg>
 </div>
 </section>

 {/* WHY US */}
 <section style={{ padding:"80px 24px", maxWidth:1200, margin:"0 auto" }}>
 <div style={{ textAlign:"center", marginBottom:48 }}>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", fontSize:36, fontWeight:800, color:"#5A2E0C" }}>Pourquoi choisir <span style={{ color:"#F28C38" }}>Villaselect</span> ?</h2>
 <p style={{ color:"#666", marginTop:10, fontSize:16 }}>Nous mettons tout en œuvre pour que votre séjour soit parfait</p>
 </div>
 <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:24 }}>
 {[
 { icon:" ", title:"Logements sélectionnés avec soin", desc:"Chaque bien est vérifié et inspecté par notre équipe." },
 { icon:" ", title:"Tarifs transparents", desc:"Prix affiché à la nuitée, aucun frais caché." },
 { icon:" ", title:"Emplacements de qualité", desc:"Des adresses de prestige dans les plus belles régions." },
 { icon:" ", title:"Réservation sécurisée", desc:"Vos données et paiements sont protégés." },
 { icon:" ", title:"Assistance client", desc:"Notre équipe est disponible 7j/7 pour vous aider." },
 ].map((item, i) => (
 <div key={i} style={{ background:"#fff", borderRadius:16, padding:28, boxShadow:"0 2px 16px rgba(0,0,0,.06)", textAlign:"center", transition:".2s" }}>
 <div style={{ fontSize:36, marginBottom:14 }}>{item.icon}</div>
 <h3 style={{ fontFamily:"Montserrat,sans-serif", fontSize:15, fontWeight:700, color:"#5A2E0C", marginBottom:8 }}>{item.title}</h3>
 <p style={{ fontSize:13, color:"#666", lineHeight:1.7 }}>{item.desc}</p>
 </div>
 ))}
 </div>
 </section>

 {/* FEATURED VILLAS */}
 <section style={{ padding:"0 24px 80px", maxWidth:1200, margin:"0 auto" }}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:36 }}>
 <div>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", fontSize:32, fontWeight:800, color:"#5A2E0C" }}>Nos biens en vedette</h2>
 <p style={{ color:"#888", marginTop:6 }}>Une sélection de nos plus belles propriétés</p>
 </div>
 <button className="btn-outline hide-mobile" onClick={() => nav("locations")}>Voir tout <Icon name="arrow" size={14} /></button>
 </div>
 <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:24 }} className="grid-villas">
 {featuredVillas.map(villa => <VillaCard key={villa.id} villa={villa} compact nav={nav} />)}
 </div>
 <div style={{ textAlign:"center", marginTop:32 }}>
 <button className="btn-primary" onClick={() => nav("locations")}>Voir toutes nos locations</button>
 </div>
 </section>

 {/* PAYMENT CARD */}
 <section style={{ background:"linear-gradient(135deg,#fff8f3,#fff3e8)", padding:"60px 24px", borderTop:"1px solid #f0e8e0", borderBottom:"1px solid #f0e8e0" }}>
 <div style={{ maxWidth:800, margin:"0 auto", textAlign:"center" }}>
 <div style={{ fontSize:32, marginBottom:12 }}> </div>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", fontSize:26, fontWeight:800, color:"#5A2E0C", marginBottom:10 }}>Paiement sécurisé par carte</h2>
 <p style={{ color:"#666", fontSize:15, marginBottom:32 }}>Un acompte de <strong>50%</strong> est débité à la réservation. Le solde est dû à l'arrivée. Séjour minimum : <strong>7 nuits</strong>.</p>
 <div style={{ display:"flex", justifyContent:"center", gap:14, flexWrap:"wrap", marginBottom:28, alignItems:"center" }}>
 {[
 { Logo: CardLogos.Visa, label:"Visa" },
 { Logo: CardLogos.Mastercard, label:"Mastercard" },
 { Logo: CardLogos.Amex, label:"American Express" },
 { Logo: CardLogos.CarteBleue, label:"Carte Bleue" },

 ].map(({ Logo, label }, i) => (
 <div key={i} title={label} style={{ background:"#fff", borderRadius:12, padding:"10px 18px", boxShadow:"0 4px 16px rgba(0,0,0,.1)", display:"flex", alignItems:"center", justifyContent:"center", height:56, minWidth:90 }}>
 <Logo h={32} />
 </div>
 ))}
 </div>
 <div style={{ display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
 {[" Paiement 100% sécurisé"," Données chiffrées SSL"," 3D Secure activé"].map((item,i) => (
 <span key={i} style={{ fontSize:13, color:"#666", fontWeight:500 }}>{item}</span>
 ))}
 </div>
 </div>
 </section>

 {/* REVIEWS */}
 <section style={{ padding:"80px 24px", maxWidth:1200, margin:"0 auto" }}>
 <div style={{ textAlign:"center", marginBottom:48 }}>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", fontSize:32, fontWeight:800, color:"#5A2E0C" }}>Ce que disent nos clients</h2>
 <p style={{ color:"#888", marginTop:8 }}>Des milliers de familles nous font confiance</p>
 </div>
 <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:24 }}>
 {reviews.map(r => (
 <div key={r.id} style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,.06)" }}>
 <Stars rating={r.rating} />
 <p style={{ fontSize:14, color:"#555", lineHeight:1.8, margin:"14px 0" }}>"{r.text}"</p>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
 <div>
 <p style={{ fontWeight:600, fontSize:14, color:"#5A2E0C" }}>{r.author}</p>
 <p style={{ fontSize:12, color:"#999" }}>{r.villa}</p>
 </div>
 <span style={{ fontSize:12, color:"#bbb" }}>{new Date(r.date).toLocaleDateString("fr-FR")}</span>
 </div>
 </div>
 ))}
 </div>
 </section>

 {/* CTA */}
 <section style={{ background:"linear-gradient(135deg,#5A2E0C,#F28C38)", padding:"80px 24px", textAlign:"center" }}>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", fontSize:36, fontWeight:900, color:"#fff", marginBottom:16 }}>Prêt pour vos prochaines vacances ?</h2>
 <p style={{ color:"rgba(255,255,255,.85)", fontSize:17, marginBottom:32 }}>Réservez votre villa de rêve dès maintenant</p>
 <button className="btn-primary" style={{ background:"#fff", color:"#5A2E0C", fontSize:17, padding:"16px 40px" }} onClick={() => nav("locations")}>
 Réserver maintenant
 </button>
 </section>
 </div>
 );
}

// ══════════════════════════════ VILLA CARD ════════════════════════════════════
function VillaCard({ villa, compact, nav, onBook }) {
 const [imgIdx, setImgIdx] = useState(0);
 return (
 <div className="card" style={{ borderRadius:16 }}>
 <div style={{ position:"relative", height:220, overflow:"hidden" }}>
 <img src={villa.photos[imgIdx]} alt={villa.name} style={{ width:"100%", height:"100%", objectFit:"cover", transition:".4s" }} />
 {villa.photos.length > 1 && (
 <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6 }}>
 {villa.photos.map((_,i) => (
 <button key={i} onClick={() => setImgIdx(i)} style={{ width:8, height:8, borderRadius:"50%", border:"none", background: i===imgIdx ? "#F28C38" : "rgba(255,255,255,.7)", cursor:"pointer", padding:0 }} />
 ))}
 </div>
 )}
 <div style={{ position:"absolute", top:12, right:12 }}>
 <span className={`badge ${villa.available ? "badge-green" : "badge-red"}`}>
 {villa.available ? "✓ Disponible" : "Indisponible"}
 </span>
 </div>
 </div>
 <div style={{ padding:20 }}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:8 }}>
 <div>
 <h3 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, fontSize:17, color:"#1a1a1a" }}>{villa.name}</h3>
 <p style={{ color:"#888", fontSize:13, display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
 <Icon name="location" size={13} /> {villa.city}
 </p>
 </div>
 <div style={{ textAlign:"right" }}>
 <span style={{ fontFamily:"Montserrat,sans-serif", fontWeight:800, fontSize:20, color:"#F28C38" }}>{formatPrice(villa.price)}</span>
 <p style={{ fontSize:11, color:"#aaa" }}>/ nuit</p>
 </div>
 </div>
 {!compact && <p style={{ fontSize:13, color:"#666", lineHeight:1.7, marginBottom:14 }}>{villa.description}</p>}
 <div style={{ display:"flex", gap:16, marginBottom:14, flexWrap:"wrap" }}>
 {[
 { icon:"bed", val: `${villa.bedrooms} ch.` },
 { icon:"bath", val: `${villa.bathrooms} sdb` },
 { icon:"users", val: `${villa.capacity} pers.` },
 ].map(item => (
 <span key={item.icon} style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"#555" }}>
 <Icon name={item.icon} size={14} /> {item.val}
 </span>
 ))}
 </div>
 <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
 {villa.wifi && <span className="badge badge-blue"><Icon name="wifi" size={11} /> Wifi</span>}
 {villa.ac && <span className="badge" style={{ background:"#e0f7fa", color:"#00838f" }}> Clim</span>}
 {villa.pool && <span className="badge" style={{ background:"#e8f5e9", color:"#2e7d32" }}><Icon name="pool" size={11} /> Piscine</span>}
 {villa.parking && <span className="badge" style={{ background:"#f3e5f5", color:"#6a1b9a" }}><Icon name="parking" size={11} /> Parking</span>}
 </div>
 {villa.available && (
 <button className="btn-primary" style={{ width:"100%" }} onClick={() => onBook ? onBook(villa) : nav("locations")}>
 Réserver
 </button>
 )}
 </div>
 </div>
 );
}

// ══════════════════════════════ LOCATIONS PAGE ════════════════════════════════
function LocationsPage({ villas, reviews, searchFilters, nav, currentUser, showToast, reservations, setReservations, saveReservationToDB }) {
 const [filters, setFilters] = useState({ pool: false, ac: false, wifi: false, parking: false, maxPrice: 1000 });
 const [bookVilla, setBookVilla] = useState(null);
 const [bookForm, setBookForm] = useState({ checkIn:"", checkOut:"", guests:1 });
 const [bookError, setBookError] = useState("");
 const [payStep, setPayStep] = useState("details"); // details | client | success
 const [cardForm, setCardForm] = useState({ name:"", number:"", expiry:"", cvv:"" });
 const [cardError, setCardError] = useState("");
 const [clientForm, setClientForm] = useState({ nom:"", prenom:"", age:"", tel:"", email:"" });
 const [clientError, setClientError] = useState("");
 const [reviewModal, setReviewModal] = useState(null);
 const [reviewForm, setReviewForm] = useState({ rating:5, text:"" });

 const getNights = () => {
 if (!bookForm.checkIn || !bookForm.checkOut) return 0;
 const d = (new Date(bookForm.checkOut) - new Date(bookForm.checkIn)) / 86400000;
 return d > 0 ? d : 0;
 };

 const openBook = (villa) => {
 if (!currentUser) { showToast("Veuillez vous connecter pour réserver.", "error"); nav("login"); return; }
 setBookVilla(villa);
 setBookError("");
 setCardError("");
 setClientError("");
 setBookForm({ checkIn:"", checkOut:"", guests:1 });
 setCardForm({ name:"", number:"", expiry:"", cvv:"" });
 setClientForm({ nom:"", prenom:"", age:"", tel:"", email:"" });
 setPayStep("details");
 };

 const goToPayment = () => {
 const nights = getNights();
 if (!bookForm.checkIn || !bookForm.checkOut) { setBookError("Veuillez sélectionner les dates."); return; }
 if (nights < 7) { setBookError("La durée minimale de séjour est de 7 nuits."); return; }
 if (bookForm.guests > bookVilla.capacity) { setBookError(`Capacité maximale : ${bookVilla.capacity} personnes.`); return; }
 setBookError("");
 setPayStep("client");
 };

 const goToConfirm = async () => {
 if (!clientForm.nom || !clientForm.prenom) { setClientError("Veuillez saisir votre nom et prénom."); return; }
 if (!clientForm.age || clientForm.age < 18) { setClientError("Vous devez avoir au moins 18 ans pour réserver."); return; }
 if (!clientForm.tel) { setClientError("Veuillez saisir votre numéro de téléphone."); return; }
 if (!clientForm.email || !clientForm.email.includes("@")) { setClientError("Veuillez saisir une adresse email valide."); return; }
 setClientError("");
 const nights = getNights();
 const total = nights * bookVilla.price;
 const deposit = total / 2;
 const newRes = {
 id: Date.now(), userId: currentUser.id, villaId: bookVilla.id,
 villaName: bookVilla.name, checkIn: bookForm.checkIn, checkOut: bookForm.checkOut,
 guests: bookForm.guests, totalPrice: total, deposit, status: "pending",
 clientNom: clientForm.nom + " " + clientForm.prenom,
 clientTel: clientForm.tel,
 clientEmail: clientForm.email,
 };
 setReservations(prev => [...prev, newRes]);
 await saveReservationToDB(newRes);
 // Envoyer email à l'admin
 await sendReservationEmail({
 clientNom: clientForm.nom + " " + clientForm.prenom,
 clientAge: clientForm.age,
 clientTel: clientForm.tel,
 clientEmail: clientForm.email,
 villaName: bookVilla.name,
 checkIn: bookForm.checkIn,
 checkOut: bookForm.checkOut,
 guests: bookForm.guests,
 nights,
 total: formatPrice(total),
 deposit: formatPrice(deposit),
 });
 setPayStep("success");
 };

 const formatCardNumber = (val) => {
 const v = val.replace(/\D/g, "").slice(0,16);
 return v.replace(/(\d{4})(?=\d)/g, "$1 ");
 };
 const formatExpiry = (val) => {
 const v = val.replace(/\D/g, "").slice(0,4);
 return v.length >= 3 ? v.slice(0,2) + "/" + v.slice(2) : v;
 };

 const submitPayment = async () => {
 const nights = getNights();
 const total = nights * bookVilla.price;
 const deposit = total / 2;
 // Enregistrer la réservation en attente SEULEMENT
 const newRes = {
 id: Date.now(), userId: currentUser.id, villaId: bookVilla.id,
 villaName: bookVilla.name, checkIn: bookForm.checkIn, checkOut: bookForm.checkOut,
 guests: bookForm.guests, totalPrice: total, deposit, status: "pending",
 paymentId: null
 };
 setReservations(prev => [...prev, newRes]);
 await saveReservationToDB(newRes);
 // Rediriger vers Stripe - PAS de message succès avant confirmation
 setPayStep("redirecting");
 redirectToStripe(deposit, bookVilla.name, bookForm.checkIn, bookForm.checkOut, bookForm.guests);
 };

 const submitReview = () => {
 if (!reviewForm.text.trim()) return;
 const newRev = { id: Date.now(), author: currentUser?.name || "Anonyme", rating: reviewForm.rating, date: today(), text: reviewForm.text, villa: reviewModal.name };
 // would normally lift state; here we just show toast
 setReviewModal(null);
 setReviewForm({ rating:5, text:"" });
 showToast("Merci pour votre avis !");
 };

 const filtered = villas.filter(v => {
 if (filters.pool && !v.pool) return false;
 if (filters.ac && !v.ac) return false;
 if (filters.wifi && !v.wifi) return false;
 if (filters.parking && !v.parking) return false;
 if (v.price > filters.maxPrice) return false;
 if (searchFilters.destination && !v.city.toLowerCase().includes(searchFilters.destination.toLowerCase())) return false;
 return true;
 });

 const nights = getNights();
 const total = bookVilla ? nights * bookVilla.price : 0;
 const deposit = total / 2;

 return (
 <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 24px" }}>
 <h1 style={{ fontFamily:"Montserrat,sans-serif", fontSize:32, fontWeight:800, color:"#5A2E0C", marginBottom:6 }}>Nos Locations</h1>
 <p style={{ color:"#888", marginBottom:32 }}>{filtered.length} bien(s) disponible(s)</p>
 <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:28, alignItems:"start" }}>
 {/* Filters */}
 <div style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,.06)", position:"sticky", top:80 }}>
 <h3 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, marginBottom:20, color:"#5A2E0C" }}>Filtres</h3>
 <div style={{ marginBottom:20 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#555", display:"block", marginBottom:8 }}>Prix max / nuit : {formatPrice(filters.maxPrice)}</label>
 <input type="range" min={50} max={1500} step={50} value={filters.maxPrice} onChange={e => setFilters(p => ({...p, maxPrice:+e.target.value}))} style={{ width:"100%", accentColor:"#F28C38" }} />
 <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#aaa" }}><span>50€</span><span>1500€</span></div>
 </div>
 {[["pool"," Piscine"],["ac"," Climatisation"],["wifi"," Wifi"],["parking"," Parking"]].map(([key, label]) => (
 <label key={key} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, cursor:"pointer", fontSize:14 }}>
 <input type="checkbox" checked={filters[key]} onChange={e => setFilters(p => ({...p, [key]: e.target.checked}))} style={{ accentColor:"#F28C38", width:16, height:16 }} />
 {label}
 </label>
 ))}
 </div>
 {/* Grid */}
 <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:24 }}>
 {filtered.map(villa => (
 <div key={villa.id}>
 <VillaCard villa={villa} nav={nav} onBook={openBook} />
 {currentUser && (
 <button onClick={() => setReviewModal(villa)} style={{ width:"100%", marginTop:8, background:"none", border:"1px solid #e2e8f0", borderRadius:10, padding:"8px", fontSize:13, color:"#888", cursor:"pointer" }}>
 Laisser un avis
 </button>
 )}
 </div>
 ))}
 {filtered.length === 0 && (
 <div style={{ gridColumn:"1/-1", textAlign:"center", padding:60, color:"#aaa" }}>
 <div style={{ fontSize:48, marginBottom:12 }}> </div>
 <p style={{ fontSize:16 }}>Aucun bien ne correspond à vos critères.</p>
 </div>
 )}
 </div>
 </div>

 {/* Booking Modal */}
 <Modal open={!!bookVilla} onClose={() => { setBookVilla(null); setPayStep("details"); }} title={
 payStep === "details" ? `Réserver – ${bookVilla?.name}` :
 payStep === "client" ? " Vos informations" :
 payStep === "redirecting" ? "Redirection..." : " Réservation confirmée !"
 }>
 {bookVilla && (
 <div>
 {/* ── ÉTAPE 1 : Détails du séjour ── */}
 {payStep === "details" && (
 <div>
 <img src={bookVilla.photos[0]} alt="" style={{ width:"100%", height:160, objectFit:"cover", borderRadius:12, marginBottom:18 }} />
 {/* Indicateur étapes */}
 <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
 <div style={{ display:"flex", alignItems:"center", gap:6 }}>
 <div style={{ width:28, height:28, borderRadius:"50%", background:"#F28C38", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>1</div>
 <span style={{ fontSize:12, fontWeight:600, color:"#F28C38" }}>Séjour</span>
 </div>
 <div style={{ flex:1, height:2, background:"#e2e8f0" }} />
 <div style={{ display:"flex", alignItems:"center", gap:6 }}>
 <div style={{ width:28, height:28, borderRadius:"50%", background:"#e2e8f0", color:"#aaa", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>2</div>
 <span style={{ fontSize:12, color:"#aaa" }}>Paiement</span>
 </div>
 <div style={{ flex:1, height:2, background:"#e2e8f0" }} />
 <div style={{ display:"flex", alignItems:"center", gap:6 }}>
 <div style={{ width:28, height:28, borderRadius:"50%", background:"#e2e8f0", color:"#aaa", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>3</div>
 <span style={{ fontSize:12, color:"#aaa" }}>Confirmation</span>
 </div>
 </div>
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
 <div>
 <label style={{ fontSize:12, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}> Arrivée</label>
 <input className="input" type="date" min={today()} value={bookForm.checkIn} onChange={e => setBookForm(p => ({...p, checkIn:e.target.value}))} />
 </div>
 <div>
 <label style={{ fontSize:12, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}> Départ</label>
 <input className="input" type="date" min={bookForm.checkIn || today()} value={bookForm.checkOut} onChange={e => setBookForm(p => ({...p, checkOut:e.target.value}))} />
 </div>
 </div>
 <div style={{ marginBottom:14 }}>
 <label style={{ fontSize:12, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}> Voyageurs (max {bookVilla.capacity})</label>
 <input className="input" type="number" min={1} max={bookVilla.capacity} value={bookForm.guests} onChange={e => setBookForm(p => ({...p, guests:+e.target.value}))} />
 </div>
 {bookError && <div style={{ background:"#fde8e8", color:"#c53030", padding:"10px 14px", borderRadius:10, fontSize:13, marginBottom:12 }}>{bookError}</div>}
 {nights > 0 && nights < 7 && (
 <div style={{ background:"#fde8e8", color:"#c53030", padding:"10px 14px", borderRadius:10, fontSize:13, marginBottom:12 }}>
 Durée minimale : 7 nuits ({nights} nuit{nights>1?"s":""} sélectionnée{nights>1?"s":""})
 </div>
 )}
 {nights >= 7 && (
 <div style={{ background:"#fff8f3", border:"1px solid #f0e8e0", borderRadius:12, padding:14, marginBottom:14 }}>
 <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 }}>
 <span style={{ color:"#666" }}>{formatPrice(bookVilla.price)} × {nights} nuits</span>
 <span style={{ fontWeight:600 }}>{formatPrice(total)}</span>
 </div>
 <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid #f0e8e0" }}>
 <span style={{ fontSize:13, color:"#666" }}> Acompte (50%) à payer maintenant</span>
 <span style={{ fontWeight:700, color:"#F28C38", fontSize:16 }}>{formatPrice(deposit)}</span>
 </div>
 </div>
 )}
 <button className="btn-primary" style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={goToPayment}>
 Continuer vers le paiement →
 </button>
 </div>
 )}

 {/* ── ÉTAPE 2 : Paiement Stripe ── */}
 {/* ── ÉTAPE 2 : Informations client ── */}
 {payStep === "client" && (
 <div>
 {/* Indicateur étapes */}
 <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
 <div style={{ display:"flex", alignItems:"center", gap:6 }}>
 <div style={{ width:28, height:28, borderRadius:"50%", background:"#38a169", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✓</div>
 <span style={{ fontSize:12, color:"#38a169" }}>Séjour</span>
 </div>
 <div style={{ flex:1, height:2, background:"#F28C38" }} />
 <div style={{ display:"flex", alignItems:"center", gap:6 }}>
 <div style={{ width:28, height:28, borderRadius:"50%", background:"#F28C38", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>2</div>
 <span style={{ fontSize:12, fontWeight:600, color:"#F28C38" }}>Vos infos</span>
 </div>
 <div style={{ flex:1, height:2, background:"#e2e8f0" }} />
 <div style={{ display:"flex", alignItems:"center", gap:6 }}>
 <div style={{ width:28, height:28, borderRadius:"50%", background:"#e2e8f0", color:"#aaa", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>3</div>
 <span style={{ fontSize:12, color:"#aaa" }}>Confirmation</span>
 </div>
 </div>

 {/* Récap séjour */}
 <div style={{ background:"linear-gradient(135deg,#5A2E0C,#8B4513)", borderRadius:12, padding:14, marginBottom:18, color:"#fff" }}>
 <p style={{ fontSize:13, opacity:.8 }}>{bookVilla.name} · {nights} nuits · {bookForm.guests} pers.</p>
 <p style={{ fontFamily:"Montserrat,sans-serif", fontWeight:800, fontSize:20, marginTop:4 }}>
 Acompte : {formatPrice(deposit)} <span style={{ fontSize:13, fontWeight:400, opacity:.8 }}>(50% du total {formatPrice(total)})</span>
 </p>
 </div>

 {/* Formulaire client */}
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
 <div>
 <label style={{ fontSize:12, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}> Nom *</label>
 <input className="input" placeholder="Dupont" value={clientForm.nom} onChange={e => setClientForm(p => ({...p, nom:e.target.value}))} />
 </div>
 <div>
 <label style={{ fontSize:12, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}> Prénom *</label>
 <input className="input" placeholder="Jean" value={clientForm.prenom} onChange={e => setClientForm(p => ({...p, prenom:e.target.value}))} />
 </div>
 </div>
 <div style={{ marginBottom:12 }}>
 <label style={{ fontSize:12, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}> Âge *</label>
 <input className="input" type="number" min={18} max={120} placeholder="Ex: 35" value={clientForm.age} onChange={e => setClientForm(p => ({...p, age:e.target.value}))} />
 </div>
 <div style={{ marginBottom:12 }}>
 <label style={{ fontSize:12, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}> Numéro de téléphone *</label>
 <input className="input" type="tel" placeholder="+33 6 00 00 00 00" value={clientForm.tel} onChange={e => setClientForm(p => ({...p, tel:e.target.value}))} />
 </div>
 <div style={{ marginBottom:16 }}>
 <label style={{ fontSize:12, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}> Adresse email *</label>
 <input className="input" type="email" placeholder="votre@email.com" value={clientForm.email} onChange={e => setClientForm(p => ({...p, email:e.target.value}))} />
 </div>

 {clientError && <div style={{ background:"#fde8e8", color:"#c53030", padding:"10px 14px", borderRadius:10, fontSize:13, marginBottom:12 }}>{clientError}</div>}

 <button className="btn-primary" style={{ width:"100%", fontSize:16, padding:"14px", marginBottom:10 }} onClick={goToConfirm}>
 Confirmer ma réservation →
 </button>
 <button onClick={() => setPayStep("details")} style={{ width:"100%", background:"none", border:"none", color:"#888", fontSize:13, cursor:"pointer", padding:"8px" }}>
 ← Retour aux dates
 </button>
 </div>
 )}

 {/* ── ÉTAPE 3 : Confirmation ── */}
 {payStep === "success" && (
 <div style={{ textAlign:"center", padding:"20px 0" }}>
 <div style={{ width:80, height:80, borderRadius:"50%", background:"#e6f4ea", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:40 }}> </div>
 <h3 style={{ fontFamily:"Montserrat,sans-serif", color:"#276749", fontSize:22, marginBottom:12 }}>
 Réservation prise en compte !
 </h3>
 <p style={{ color:"#555", fontSize:15, lineHeight:1.8, marginBottom:20 }}>
 Bonjour <strong>{clientForm.prenom} {clientForm.nom}</strong>,<br/>
 votre réservation est bien enregistrée.<br/>
 <strong>Un email de confirmation vous sera envoyé</strong> à l'adresse<br/>
 <span style={{ color:"#F28C38", fontWeight:600 }}>{clientForm.email}</span>
 </p>

 {/* Récapitulatif */}
 <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:20, marginBottom:20, textAlign:"left" }}>
 <p style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, color:"#5A2E0C", marginBottom:12, fontSize:15 }}> Récapitulatif de votre réservation</p>
 <p style={{ fontSize:13, lineHeight:2.2, color:"#555" }}>
 <strong>{bookVilla.name}</strong><br/>
 {new Date(bookForm.checkIn).toLocaleDateString("fr-FR")} → {new Date(bookForm.checkOut).toLocaleDateString("fr-FR")}<br/>
 {nights} nuit{nights>1?"s":""}<br/>
 {bookForm.guests} voyageur{bookForm.guests>1?"s":""}<br/>
 {clientForm.tel}<br/>
 </p>
 <div style={{ borderTop:"1px solid #e2e8f0", marginTop:12, paddingTop:12 }}>
 <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
 <span style={{ fontSize:13, color:"#666" }}>Total séjour</span>
 <span style={{ fontWeight:600 }}>{formatPrice(total)}</span>
 </div>
 <div style={{ display:"flex", justifyContent:"space-between" }}>
 <span style={{ fontSize:14, color:"#5A2E0C", fontWeight:600 }}> Acompte à régler (50%)</span>
 <span style={{ fontWeight:800, fontSize:18, color:"#F28C38" }}>{formatPrice(deposit)}</span>
 </div>
 </div>
 </div>

 <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:14, marginBottom:20, fontSize:13, color:"#92400e", textAlign:"left" }}>
 <strong>Important :</strong> Votre réservation sera confirmée après réception de l'acompte de <strong>{formatPrice(deposit)}</strong>. Nous vous contacterons par email sous 24h avec les instructions de paiement.
 </div>

 <button className="btn-primary" style={{ width:"100%" }} onClick={() => { setBookVilla(null); setPayStep("details"); nav("reservations"); }}>
 Voir mes réservations
 </button>
 </div>
 )}
 </div>
 )}
 </Modal>

 {/* Review Modal */}
 <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title={`Avis – ${reviewModal?.name}`}>
 <div>
 <div style={{ marginBottom:16 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:8 }}>Note</label>
 <div style={{ display:"flex", gap:8 }}>
 {[1,2,3,4,5].map(s => (
 <button key={s} onClick={() => setReviewForm(p => ({...p, rating:s}))} style={{ background:"none", border:"none", cursor:"pointer", color: s <= reviewForm.rating ? "#F28C38" : "#ddd", fontSize:28 }}>★</button>
 ))}
 </div>
 </div>
 <div style={{ marginBottom:16 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:8 }}>Votre avis</label>
 <textarea className="input" rows={4} value={reviewForm.text} onChange={e => setReviewForm(p => ({...p, text:e.target.value}))} placeholder="Partagez votre expérience..." style={{ resize:"vertical" }} />
 </div>
 <button className="btn-primary" style={{ width:"100%" }} onClick={submitReview}>Publier l'avis</button>
 </div>
 </Modal>
 </div>
 );
}

// ══════════════════════════════ RESERVATIONS PAGE ════════════════════════════
function ReservationsPage({ reservations, currentUser, setReservations, showToast, updateReservationInDB }) {
 const [tab, setTab] = useState("pending");
 const tabs = [
 { id:"pending", label:"En attente" },
 { id:"confirmed", label:"Confirmées" },
 { id:"cancelled", label:"Annulées" },
 { id:"all", label:"Historique" },
 ];
 const filtered = tab === "all" ? reservations : reservations.filter(r => r.status === tab);

 const cancel = async (id) => {
 setReservations(prev => prev.map(r => r.id === id ? {...r, status:"cancelled"} : r));
 await updateReservationInDB(id, { status: "cancelled" });
 showToast("Réservation annulée.");
 };

 return (
 <div style={{ maxWidth:900, margin:"0 auto", padding:"40px 24px" }}>
 <h1 style={{ fontFamily:"Montserrat,sans-serif", fontSize:30, fontWeight:800, color:"#5A2E0C", marginBottom:6 }}>
 <Icon name="shield" size={28} /> Mes Réservations
 </h1>
 <p style={{ color:"#888", marginBottom:28 }}>Bonjour, <strong>{currentUser.name}</strong> – gérez vos séjours ici.</p>
 <div style={{ display:"flex", gap:4, marginBottom:28, background:"#f0f0f0", borderRadius:12, padding:4, flexWrap:"wrap" }}>
 {tabs.map(t => (
 <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:"1 1 auto", padding:"10px 16px", borderRadius:8, border:"none", background: tab===t.id ? "#fff" : "transparent", fontWeight: tab===t.id ? 700 : 500, color: tab===t.id ? "#5A2E0C" : "#666", boxShadow: tab===t.id ? "0 2px 8px rgba(0,0,0,.1)" : "none", fontFamily:"Poppins,sans-serif", fontSize:13, transition:".2s", cursor:"pointer" }}>
 {t.label} {tab===t.id && `(${filtered.length})`}
 </button>
 ))}
 </div>
 {filtered.length === 0 ? (
 <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>
 <div style={{ fontSize:48, marginBottom:12 }}> </div>
 <p>Aucune réservation dans cette catégorie.</p>
 </div>
 ) : (
 <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
 {filtered.map(res => (
 <div key={res.id} style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,.06)" }}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", flexWrap:"wrap", gap:12 }}>
 <div>
 <h3 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, fontSize:17, color:"#1a1a1a" }}>{res.villaName}</h3>
 <p style={{ fontSize:13, color:"#888", marginTop:4 }}>
 {new Date(res.checkIn).toLocaleDateString("fr-FR")} → {new Date(res.checkOut).toLocaleDateString("fr-FR")}
 &nbsp;·&nbsp; {res.guests} voyageur{res.guests>1?"s":""}
 </p>
 </div>
 <span className={`badge ${res.status === "confirmed" ? "badge-green" : res.status === "cancelled" ? "badge-red" : "badge-orange"}`}>
 {res.status === "confirmed" ? "✓ Confirmée" : res.status === "cancelled" ? "✗ Annulée" : " En attente"}
 </span>
 </div>
 <div style={{ display:"flex", gap:24, marginTop:16, padding:"14px 0", borderTop:"1px solid #f5f5f5", borderBottom:"1px solid #f5f5f5", flexWrap:"wrap" }}>
 <div><p style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>Total séjour</p><p style={{ fontWeight:700, color:"#1a1a1a" }}>{formatPrice(res.totalPrice)}</p></div>
 <div><p style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>Acompte (50%)</p><p style={{ fontWeight:700, color:"#F28C38" }}>{formatPrice(res.deposit)}</p></div>
 <div><p style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>Réf.</p><p style={{ fontWeight:600, fontSize:12 }}>#{res.id}</p></div>
 </div>
 {res.status === "pending" && (
 <div style={{ marginTop:14, display:"flex", gap:10 }}>
 <button className="btn-outline btn-sm" style={{ borderColor:"#e53e3e", color:"#e53e3e" }} onClick={() => cancel(res.id)}>Annuler</button>
 <div style={{ fontSize:12, color:"#888", display:"flex", alignItems:"center" }}>
 Acompte de {formatPrice(res.deposit)} à régler par carte bancaire
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
}

// ══════════════════════════════ CONTACT PAGE ══════════════════════════════════
function ContactPage({ showToast }) {
 const [form, setForm] = useState({ name:"", email:"", subject:"", message:"" });
 const submit = () => {
 if (!form.name || !form.email || !form.message) { showToast("Veuillez remplir tous les champs.", "error"); return; }
 setForm({ name:"", email:"", subject:"", message:"" });
 showToast("Message envoyé ! Nous vous répondrons sous 24h.");
 };
 return (
 <div style={{ maxWidth:1000, margin:"0 auto", padding:"60px 24px" }}>
 <h1 style={{ fontFamily:"Montserrat,sans-serif", fontSize:36, fontWeight:800, color:"#5A2E0C", marginBottom:6 }}>Contactez-nous</h1>
 <p style={{ color:"#888", marginBottom:40 }}>Notre équipe est disponible pour répondre à toutes vos questions.</p>
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:40 }}>
 <div>
 <div style={{ marginBottom:16 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}>Nom complet *</label>
 <input className="input" value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} placeholder="Votre nom" />
 </div>
 <div style={{ marginBottom:16 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}>Email *</label>
 <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email:e.target.value}))} placeholder="votre@email.com" />
 </div>
 <div style={{ marginBottom:16 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}>Sujet</label>
 <input className="input" value={form.subject} onChange={e => setForm(p => ({...p, subject:e.target.value}))} placeholder="Objet de votre message" />
 </div>
 <div style={{ marginBottom:20 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}>Message *</label>
 <textarea className="input" rows={5} value={form.message} onChange={e => setForm(p => ({...p, message:e.target.value}))} placeholder="Décrivez votre demande..." style={{ resize:"vertical" }} />
 </div>
 <button className="btn-primary" style={{ width:"100%" }} onClick={submit}>Envoyer le message</button>
 </div>
 <div>
 <div style={{ background:"#fff", borderRadius:16, padding:28, boxShadow:"0 2px 16px rgba(0,0,0,.06)", marginBottom:20 }}>
 <h3 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, color:"#5A2E0C", marginBottom:20 }}>Nos coordonnées</h3>
 {[
 { icon:"mail", text:"adminvillaselect@gmail.com" },
 { icon:"phone", text:"+33 (0)X XX XX XX XX" },
 { icon:"location", text:"France" },
 { icon:"calendar", text:"Lun–Dim, 9h–20h" },
 ].map((item, i) => (
 <div key={i} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
 <div style={{ width:40, height:40, background:"#fff3e8", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", color:"#F28C38", flexShrink:0 }}>
 <Icon name={item.icon} size={18} />
 </div>
 <span style={{ fontSize:14, color:"#555" }}>{item.text}</span>
 </div>
 ))}
 </div>
 <div style={{ background:"linear-gradient(135deg,#5A2E0C,#8B4513)", borderRadius:16, padding:28, color:"#fff" }}>
 <h3 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, marginBottom:14 }}>Paiement sécurisé</h3>
 <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:14 }}>
 {[CardLogos.Visa, CardLogos.Mastercard, CardLogos.Amex, CardLogos.CarteBleue].map((Logo, i) => (
 <div key={i} style={{ background:"rgba(255,255,255,.15)", borderRadius:8, padding:"6px 10px", display:"flex", alignItems:"center", justifyContent:"center" }}>
 <Logo h={22} />
 </div>
 ))}
 </div>
 <p style={{ fontSize:12, opacity:.8, lineHeight:1.8 }}>
 Paiement 100% sécurisé SSL<br/>
 3D Secure activé<br/>
 Acompte de 50% à la réservation
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}

// ══════════════════════════════ LOGIN / REGISTER ══════════════════════════════
function LoginPage({ users, setCurrentUser, nav, showToast }) {
 const [form, setForm] = useState({ email:"", password:"" });
 const [error, setError] = useState("");
 const submit = () => {
 const user = users.find(u => u.email === form.email && u.password === form.password);
 if (!user) { setError("Email ou mot de passe incorrect."); return; }
 saveSession(user);
 setCurrentUser(user);
 showToast(`Bienvenue, ${user.name} !`);
 nav(user.role === "admin" ? "admin" : "home");
 };
 return (
 <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
 <div style={{ background:"#fff", borderRadius:20, padding:40, width:"100%", maxWidth:420, boxShadow:"0 8px 40px rgba(0,0,0,.1)" }}>
 <div style={{ textAlign:"center", marginBottom:28 }}>
 <div style={{ width:56, height:56, background:"linear-gradient(135deg,#F28C38,#5A2E0C)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
 <span style={{ color:"#fff", fontFamily:"Montserrat,sans-serif", fontWeight:900, fontSize:24 }}>V</span>
 </div>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:800, color:"#5A2E0C", fontSize:24 }}>Connexion</h2>
 <p style={{ color:"#888", fontSize:14, marginTop:4 }}>Accédez à votre espace personnel</p>
 </div>
 {error && <div style={{ background:"#fde8e8", color:"#c53030", padding:"10px 14px", borderRadius:10, fontSize:13, marginBottom:14 }}>{error}</div>}
 <div style={{ marginBottom:14 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}>Email</label>
 <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email:e.target.value}))} placeholder="votre@email.com" />
 </div>
 <div style={{ marginBottom:20 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}>Mot de passe</label>
 <input className="input" type="password" value={form.password} onChange={e => setForm(p => ({...p, password:e.target.value}))} placeholder="••••••••" onKeyDown={e => e.key==="Enter" && submit()} />
 </div>
 <button className="btn-primary" style={{ width:"100%", marginBottom:14 }} onClick={submit}>Se connecter</button>
 <p style={{ textAlign:"center", fontSize:13, color:"#888" }}>
 Pas encore de compte ? <button onClick={() => nav("register")} style={{ background:"none", border:"none", color:"#F28C38", fontWeight:600, cursor:"pointer" }}>S'inscrire</button>
 </p>
 <div style={{ background:"#f8f8f8", borderRadius:10, padding:12, marginTop:16, fontSize:12, color:"#888" }}>
 <strong>Démo :</strong><br/>
 Admin : admin@villaselect.com / admin123<br/>
 Utilisateur : user@demo.com / demo123
 </div>
 </div>
 </div>
 );
}

function RegisterPage({ users, setUsers, nav, showToast, saveUserToDB }) {
 const [form, setForm] = useState({ name:"", email:"", password:"", confirm:"" });
 const [error, setError] = useState("");
 const [success, setSuccess] = useState(false);

 const submit = async () => {
 if (!form.name || !form.email || !form.password) { setError("Tous les champs sont obligatoires."); return; }
 if (form.password !== form.confirm) { setError("Les mots de passe ne correspondent pas."); return; }
 if (users.find(u => u.email === form.email)) { setError("Cet email est déjà utilisé."); return; }
 const newUser = { id: Date.now(), name: form.name, email: form.email, password: form.password, role:"user", confirmed: true };
 setUsers(prev => [...prev, newUser]);
 await saveUserToDB(newUser);
 setSuccess(true);
 };

 if (success) return (
 <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
 <div style={{ background:"#fff", borderRadius:20, padding:40, width:"100%", maxWidth:440, boxShadow:"0 8px 40px rgba(0,0,0,.1)", textAlign:"center" }}>
 <div style={{ width:80, height:80, borderRadius:"50%", background:"#e6f4ea", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:40 }}> </div>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:800, color:"#5A2E0C", fontSize:24, marginBottom:12 }}>
 Compte créé avec succès !
 </h2>
 <p style={{ color:"#555", fontSize:15, lineHeight:1.8, marginBottom:28 }}>
 Bienvenue sur <strong style={{ color:"#F28C38" }}>Villaselect</strong>, <strong>{form.name}</strong> !<br/>
 Vous pouvez maintenant vous connecter avec vos identifiants.
 </p>
 <button className="btn-primary" style={{ width:"100%", fontSize:16, padding:"14px" }} onClick={() => nav("login")}>
 Se connecter maintenant
 </button>
 </div>
 </div>
 );

 return (
 <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
 <div style={{ background:"#fff", borderRadius:20, padding:40, width:"100%", maxWidth:420, boxShadow:"0 8px 40px rgba(0,0,0,.1)" }}>
 <div style={{ textAlign:"center", marginBottom:24 }}>
 <div style={{ width:52, height:52, background:"linear-gradient(135deg,#F28C38,#5A2E0C)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
 <span style={{ color:"#fff", fontFamily:"Montserrat,sans-serif", fontWeight:900, fontSize:22 }}>V</span>
 </div>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:800, color:"#5A2E0C", fontSize:24, marginBottom:4 }}>Créer un compte</h2>
 <p style={{ color:"#888", fontSize:14 }}>Rejoignez Villaselect dès aujourd'hui</p>
 </div>
 {error && <div style={{ background:"#fde8e8", color:"#c53030", padding:"10px 14px", borderRadius:10, fontSize:13, marginBottom:14 }}>{error}</div>}
 {[
 ["name"," Nom complet","text","Jean Dupont"],
 ["email"," Email","email","votre@email.com"],
 ["password"," Mot de passe","password","••••••••"],
 ["confirm"," Confirmer le mot de passe","password","••••••••"]
 ].map(([key, label, type, ph]) => (
 <div key={key} style={{ marginBottom:14 }}>
 <label style={{ fontSize:13, fontWeight:600, color:"#5A2E0C", display:"block", marginBottom:6 }}>{label}</label>
 <input className="input" type={type} value={form[key]} onChange={e => setForm(p => ({...p, [key]:e.target.value}))} placeholder={ph} onKeyDown={e => e.key==="Enter" && submit()} />
 </div>
 ))}
 <button className="btn-primary" style={{ width:"100%", marginTop:6, marginBottom:14 }} onClick={submit}>
 Créer mon compte
 </button>
 <p style={{ textAlign:"center", fontSize:13, color:"#888" }}>
 Déjà un compte ? <button onClick={() => nav("login")} style={{ background:"none", border:"none", color:"#F28C38", fontWeight:600, cursor:"pointer" }}>Se connecter</button>
 </p>
 </div>
 </div>
 );
}


// ══════════════════════════════ ADMIN PAGE ════════════════════════════════════
function AdminPage({ villas, setVillas, reservations, setReservations, users, setUsers, showToast, reviews, setReviews }) {
 const [tab, setTab] = useState("villas");
 const [editVilla, setEditVilla] = useState(null);
 const [addForm, setAddForm] = useState(null);

 const emptyVilla = { name:"", city:"", price:200, bedrooms:2, bathrooms:1, capacity:4, wifi:true, ac:true, pool:false, parking:true, available:true, description:"", photos:[""] };

 const saveVilla = (villa) => {
 if (villa.id) {
 setVillas(prev => prev.map(v => v.id === villa.id ? villa : v));
 showToast("Villa mise à jour !");
 } else {
 setVillas(prev => [...prev, { ...villa, id: Date.now() }]);
 showToast("Villa ajoutée !");
 }
 setEditVilla(null);
 setAddForm(null);
 };

 const deleteVilla = (id) => {
 setVillas(prev => prev.filter(v => v.id !== id));
 showToast("Villa supprimée.");
 };

 const updateResStatus = async (id, status) => {
 setReservations(prev => prev.map(r => r.id === id ? {...r, status} : r));
 if (supabaseReady()) {
 try { await sb.from("reservations").update({ status }, { id }); } catch(e) { console.error(e); }
 }
 // Envoyer email de confirmation au client
 if (status === "confirmed") {
 const res = reservations.find(r => r.id === id);
 if (res) {
 await sendConfirmationToClient(res);
 showToast(" Réservation confirmée ! Email envoyé au client.");
 }
 } else if (status === "cancelled") {
 showToast("Réservation annulée.");
 } else {
 showToast("Statut mis à jour.");
 }
 };

 const adminTabs = [
 { id:"villas", label:" Villas" },
 { id:"reservations", label:" Réservations" },
 { id:"users", label:" Utilisateurs" },
 { id:"reviews", label:" Avis" },
 ];

 return (
 <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 24px" }}>
 <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:32 }}>
 <div style={{ width:48, height:48, background:"linear-gradient(135deg,#5A2E0C,#F28C38)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
 <Icon name="shield" size={22} />
 </div>
 <div>
 <h1 style={{ fontFamily:"Montserrat,sans-serif", fontSize:28, fontWeight:800, color:"#5A2E0C" }}>Tableau de bord Admin</h1>
 <p style={{ color:"#888", fontSize:13 }}>Gérez votre plateforme Villaselect</p>
 </div>
 </div>

 {/* Stats */}
 <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:16, marginBottom:28 }}>
 {[
 { label:"Villas actives", val: villas.filter(v=>v.available).length, icon:" ", color:"#e8f5e9" },
 { label:"Réservations", val: reservations.length, icon:" ", color:"#fff3e0" },
 { label:"Utilisateurs", val: users.length, icon:" ", color:"#e8f0fe" },
 { label:"Avis clients", val: reviews.length, icon:" ", color:"#fff8e1" },
 ].map((s,i) => (
 <div key={i} style={{ background:"#fff", borderRadius:14, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,.06)" }}>
 <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
 <div style={{ fontFamily:"Montserrat,sans-serif", fontWeight:800, fontSize:26, color:"#5A2E0C" }}>{s.val}</div>
 <div style={{ fontSize:12, color:"#888" }}>{s.label}</div>
 </div>
 ))}
 </div>

 {/* Tabs */}
 <div style={{ display:"flex", gap:4, background:"#f0f0f0", borderRadius:12, padding:4, marginBottom:24, flexWrap:"wrap" }}>
 {adminTabs.map(t => (
 <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:"1 1 auto", padding:"10px 16px", borderRadius:8, border:"none", background: tab===t.id ? "#fff" : "transparent", fontWeight: tab===t.id ? 700 : 500, color: tab===t.id ? "#5A2E0C" : "#666", boxShadow: tab===t.id ? "0 2px 8px rgba(0,0,0,.1)" : "none", fontFamily:"Poppins,sans-serif", fontSize:13, cursor:"pointer", transition:".2s" }}>
 {t.label}
 </button>
 ))}
 </div>

 {/* VILLAS TAB */}
 {tab === "villas" && (
 <div>
 {/* Bouton Ajouter - grand et visible sur mobile */}
 <button className="btn-primary" style={{ width:"100%", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"16px", fontSize:16, borderRadius:14 }} onClick={() => setAddForm({ ...emptyVilla })}>
 <Icon name="plus" size={20} /> Ajouter une nouvelle villa
 </button>
 <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
 {villas.map(v => (
 <div key={v.id} style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
 <div style={{ position:"relative", height:180 }}>
 <img src={v.photos[0]} alt={v.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
 <span className={`badge ${v.available ? "badge-green" : "badge-red"}`} style={{ position:"absolute", top:12, right:12, fontSize:13, padding:"6px 12px" }}>
 {v.available ? "✓ Disponible" : "✗ Indisponible"}
 </span>
 </div>
 <div style={{ padding:18 }}>
 <h3 style={{ fontWeight:700, fontSize:17, color:"#1a1a1a", marginBottom:4 }}>{v.name}</h3>
 <p style={{ fontSize:14, color:"#888", marginBottom:6 }}> {v.city}</p>
 <p style={{ fontSize:16, fontWeight:700, color:"#F28C38", marginBottom:14 }}>{formatPrice(v.price)} / nuit</p>
 <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
 <p style={{ fontSize:13, color:"#666" }}> {v.bedrooms} ch. · {v.bathrooms} sdb · {v.capacity} pers.</p>
 </div>
 {/* Boutons grands pour mobile */}
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14 }}>
 <button style={{ background:"#5A2E0C", color:"#fff", border:"none", padding:"14px", borderRadius:12, fontSize:15, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:8, cursor:"pointer" }} onClick={() => setEditVilla({ ...v })}>
 Modifier
 </button>
 <button style={{ background:"#fde8e8", color:"#c53030", border:"2px solid #e53e3e", padding:"14px", borderRadius:12, fontSize:15, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:8, cursor:"pointer" }} onClick={() => { if(window.confirm("Supprimer cette villa ?")) deleteVilla(v.id); }}>
 Supprimer
 </button>
 </div>
 {/* Toggle disponibilité */}
 <button style={{ width:"100%", marginTop:10, background: v.available ? "#e6f4ea" : "#fff3e0", color: v.available ? "#276749" : "#e65100", border:"none", padding:"12px", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" }}
 onClick={() => { setVillas(prev => prev.map(x => x.id === v.id ? {...x, available:!x.available} : x)); showToast("Disponibilité mise à jour !"); }}>
 {v.available ? " Marquer indisponible" : " Marquer disponible"}
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* RESERVATIONS TAB */}
 {tab === "reservations" && (
 <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
 {reservations.map(r => (
 <div key={r.id} style={{ background:"#fff", borderRadius:14, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,.06)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
 <div>
 <h3 style={{ fontWeight:600, fontSize:15 }}>{r.villaName}</h3>
 <p style={{ fontSize:13, color:"#888" }}>
 {new Date(r.checkIn).toLocaleDateString("fr-FR")} → {new Date(r.checkOut).toLocaleDateString("fr-FR")}
 &nbsp;·&nbsp; {r.guests} pers. &nbsp;·&nbsp; Total : {formatPrice(r.totalPrice)} &nbsp;·&nbsp; Acompte : {formatPrice(r.deposit)}
 </p>
 </div>
 <div style={{ display:"flex", gap:8, alignItems:"center" }}>
 <span className={`badge ${r.status === "confirmed" ? "badge-green" : r.status === "cancelled" ? "badge-red" : "badge-orange"}`}>
 {r.status === "confirmed" ? "Confirmée" : r.status === "cancelled" ? "Annulée" : "En attente"}
 </span>
 {r.status === "pending" && (
 <>
 <button className="btn-primary btn-sm" onClick={() => updateResStatus(r.id, "confirmed")}>✓ Confirmer</button>
 <button style={{ background:"none", border:"1px solid #e53e3e", color:"#e53e3e", padding:"7px 12px", borderRadius:50, fontSize:12, cursor:"pointer" }} onClick={() => updateResStatus(r.id, "cancelled")}>✗ Annuler</button>
 </>
 )}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* USERS TAB */}
 {tab === "users" && (
 <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
 {/* Comptes confirmés */}
 <div style={{ background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,.06)" }}>
 <div style={{ padding:"14px 20px", background:"#f0fff4", borderBottom:"1px solid #c6f6d5", display:"flex", alignItems:"center", gap:8 }}>
 <span style={{ fontSize:16 }}> </span>
 <span style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, fontSize:14, color:"#276749" }}>Comptes actifs ({users.filter(u=>u.confirmed).length})</span>
 </div>
 <table style={{ width:"100%", borderCollapse:"collapse" }}>
 <thead>
 <tr style={{ background:"#fafafa" }}>
 {["Nom","Email","Rôle","Actions"].map(h => (
 <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, fontWeight:700, color:"#888", borderBottom:"1px solid #f0f0f0" }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {users.filter(u=>u.confirmed).map(u => (
 <tr key={u.id} style={{ borderBottom:"1px solid #f8f8f8" }}>
 <td style={{ padding:"12px 16px", fontWeight:600, fontSize:14 }}>{u.name}</td>
 <td style={{ padding:"12px 16px", fontSize:13 }}>{u.email}</td>
 <td style={{ padding:"12px 16px" }}>
 <span className={`badge ${u.role === "admin" ? "badge-orange" : "badge-blue"}`}>{u.role}</span>
 </td>
 <td style={{ padding:"12px 16px" }}>
 {u.role !== "admin" && (
 <button style={{ background:"none", border:"1px solid #e53e3e", color:"#e53e3e", padding:"6px 12px", borderRadius:50, fontSize:12, cursor:"pointer" }}
 onClick={() => { setUsers(prev => prev.filter(x => x.id !== u.id)); showToast("Utilisateur supprimé."); }}>
 Supprimer
 </button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {/* Comptes en attente */}
 <div style={{ background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,.06)" }}>
 <div style={{ padding:"14px 20px", background:"#fffbeb", borderBottom:"1px solid #fde68a", display:"flex", alignItems:"center", gap:8 }}>
 <span style={{ fontSize:16 }}> </span>
 <span style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, fontSize:14, color:"#92400e" }}>En attente de confirmation email ({users.filter(u=>!u.confirmed).length})</span>
 </div>
 {users.filter(u=>!u.confirmed).length === 0 ? (
 <p style={{ padding:"20px", fontSize:13, color:"#aaa", textAlign:"center" }}>Aucun compte en attente</p>
 ) : (
 <table style={{ width:"100%", borderCollapse:"collapse" }}>
 <tbody>
 {users.filter(u=>!u.confirmed).map(u => (
 <tr key={u.id} style={{ borderBottom:"1px solid #f8f8f8" }}>
 <td style={{ padding:"12px 16px", fontWeight:600, fontSize:14 }}>{u.name}</td>
 <td style={{ padding:"12px 16px", fontSize:13 }}>{u.email}</td>
 <td style={{ padding:"12px 16px" }}><span className="badge badge-orange"> Email non confirmé</span></td>
 <td style={{ padding:"12px 16px" }}>
 <button style={{ background:"none", border:"1px solid #e53e3e", color:"#e53e3e", padding:"6px 12px", borderRadius:50, fontSize:12, cursor:"pointer" }}
 onClick={() => { setUsers(prev => prev.filter(x => x.id !== u.id)); showToast("Utilisateur supprimé."); }}>
 Supprimer
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 )}

 {/* REVIEWS TAB */}
 {tab === "reviews" && (
 <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
 {reviews.map(r => (
 <div key={r.id} style={{ background:"#fff", borderRadius:14, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,.06)", display:"flex", justifyContent:"space-between", alignItems:"start", gap:12 }}>
 <div>
 <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
 <Stars rating={r.rating} size={14} />
 <span style={{ fontSize:13, fontWeight:600 }}>{r.author}</span>
 <span style={{ fontSize:12, color:"#aaa" }}>· {r.villa}</span>
 </div>
 <p style={{ fontSize:13, color:"#555" }}>{r.text}</p>
 </div>
 <button style={{ background:"none", border:"1px solid #e53e3e", color:"#e53e3e", padding:"6px 12px", borderRadius:50, fontSize:12, cursor:"pointer", flexShrink:0 }}
 onClick={() => { setReviews(prev => prev.filter(x => x.id !== r.id)); showToast("Avis supprimé."); }}>
 Supprimer
 </button>
 </div>
 ))}
 </div>
 )}

 {/* Edit/Add Villa Modal */}
 <VillaFormModal open={!!(editVilla || addForm)} onClose={() => { setEditVilla(null); setAddForm(null); }} villa={editVilla || addForm} onSave={saveVilla} />
 </div>
 );
}

function VillaFormModal({ open, onClose, villa, onSave }) {
 const [form, setForm] = useState(villa || {});
 useEffect(() => { if (villa) setForm(villa); }, [villa]);
 if (!open || !form) return null;

 const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

 const inputStyle = { width:"100%", padding:"14px 16px", border:"2px solid #e2e8f0", borderRadius:12, fontSize:16, outline:"none", fontFamily:"Poppins,sans-serif", marginBottom:16, background:"#fff" };
 const labelStyle = { fontSize:14, fontWeight:700, color:"#5A2E0C", display:"block", marginBottom:8 };

 return (
 <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:1000, overflowY:"auto", padding:"20px 16px" }}>
 {/* Header */}
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, paddingBottom:16, borderBottom:"2px solid #f0e8e0" }}>
 <h2 style={{ fontFamily:"Montserrat,sans-serif", color:"#5A2E0C", fontSize:22, fontWeight:800 }}>
 {form.id ? " Modifier la villa" : " Nouvelle villa"}
 </h2>
 <button onClick={onClose} style={{ background:"#f5f5f5", border:"none", borderRadius:10, padding:"10px 16px", fontSize:14, fontWeight:600, cursor:"pointer" }}>✕ Fermer</button>
 </div>

 {/* Nom */}
 <label style={labelStyle}> Nom de la villa *</label>
 <input style={inputStyle} placeholder="Ex: Villa Soleil d'Or" value={form.name || ""} onChange={e => f("name", e.target.value)} />

 {/* Ville */}
 <label style={labelStyle}> Ville *</label>
 <input style={inputStyle} placeholder="Ex: Cannes" value={form.city || ""} onChange={e => f("city", e.target.value)} />

 {/* Prix */}
 <label style={labelStyle}> Prix par nuit (€) *</label>
 <input style={inputStyle} type="number" min={0} placeholder="Ex: 350" value={form.price || ""} onChange={e => f("price", +e.target.value)} />

 {/* Description */}
 <label style={labelStyle}> Description</label>
 <textarea style={{...inputStyle, minHeight:100, resize:"vertical"}} placeholder="Décrivez la villa..." value={form.description || ""} onChange={e => f("description", e.target.value)} />

 {/* Chiffres */}
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
 {[["bedrooms"," Chambres"],["bathrooms"," Salles de bain"],["capacity"," Capacité"]].map(([key, label]) => (
 <div key={key}>
 <label style={{...labelStyle, fontSize:12}}>{label}</label>
 <input style={{...inputStyle, marginBottom:0, textAlign:"center", fontSize:18, fontWeight:700}} type="number" min={0} value={form[key] || ""} onChange={e => f(key, +e.target.value)} />
 </div>
 ))}
 </div>

 {/* Équipements */}
 <label style={labelStyle}> Équipements</label>
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
 {[["wifi"," Wifi"],["ac"," Climatisation"],["pool"," Piscine"],["parking"," Parking"]].map(([key, label]) => (
 <button key={key} onClick={() => f(key, !form[key])} style={{ padding:"14px", borderRadius:12, border:`2px solid ${form[key] ? "#F28C38" : "#e2e8f0"}`, background: form[key] ? "#fff8f3" : "#fff", color: form[key] ? "#F28C38" : "#888", fontWeight:600, fontSize:14, cursor:"pointer", transition:".2s" }}>
 {form[key] ? " " : " "} {label}
 </button>
 ))}
 </div>

 {/* Disponibilité */}
 <button onClick={() => f("available", !form.available)} style={{ width:"100%", padding:"14px", borderRadius:12, border:`2px solid ${form.available ? "#38a169" : "#e53e3e"}`, background: form.available ? "#e6f4ea" : "#fde8e8", color: form.available ? "#276749" : "#c53030", fontWeight:700, fontSize:15, cursor:"pointer", marginBottom:16 }}>
 {form.available ? " Villa DISPONIBLE" : " Villa INDISPONIBLE"} — Appuyez pour changer
 </button>

 {/* Photo Upload ou URL */}
 <label style={labelStyle}> Photos de la villa</label>
 
 {/* Aperçu photos existantes */}
 {form.photos && form.photos.filter(p => p).length > 0 && (
 <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
 {form.photos.filter(p => p).map((photo, i) => (
 <div key={i} style={{ position:"relative", width:80, height:80 }}>
 <img src={photo} alt="" style={{ width:80, height:80, objectFit:"cover", borderRadius:10, border:"2px solid #F28C38" }} />
 <button onClick={() => f("photos", form.photos.filter((_, idx) => idx !== i))}
 style={{ position:"absolute", top:-6, right:-6, background:"#e53e3e", color:"#fff", border:"none", borderRadius:"50%", width:20, height:20, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
 </div>
 ))}
 </div>
 )}

 {/* Bouton upload depuis galerie */}
 <label style={{ display:"block", width:"100%", background:"linear-gradient(135deg,#fff8f3,#fff3e0)", border:"2px dashed #F28C38", borderRadius:14, padding:"20px", textAlign:"center", cursor:"pointer", marginBottom:12 }}>
 <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e => {
 const files = Array.from(e.target.files);
 files.forEach(file => {
 const reader = new FileReader();
 reader.onload = (ev) => {
 f("photos", [...(form.photos || []).filter(p => p), ev.target.result]);
 };
 reader.readAsDataURL(file);
 });
 }} />
 <div style={{ fontSize:32, marginBottom:8 }}> </div>
 <p style={{ fontWeight:700, color:"#F28C38", fontSize:15, marginBottom:4 }}>Appuyez pour choisir des photos</p>
 <p style={{ fontSize:12, color:"#888" }}>Depuis votre galerie · Plusieurs photos possibles</p>
 </label>

 {/* Ou par URL */}
 <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
 <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
 <span style={{ fontSize:12, color:"#aaa", fontWeight:600 }}>OU</span>
 <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
 </div>
 <input style={{...inputStyle, marginBottom:4}} placeholder="Coller un lien photo (https://...)" 
 onKeyDown={e => {
 if (e.key === "Enter" && e.target.value) {
 f("photos", [...(form.photos || []).filter(p => p), e.target.value]);
 e.target.value = "";
 }
 }}
 onBlur={e => {
 if (e.target.value) {
 f("photos", [...(form.photos || []).filter(p => p), e.target.value]);
 e.target.value = "";
 }
 }}
 />
 <p style={{ fontSize:12, color:"#aaa", marginBottom:16 }}>Appuyez sur Entrée pour ajouter le lien</p>

 {/* Bouton Sauvegarder */}
 <button style={{ width:"100%", background:"linear-gradient(135deg,#F28C38,#d97720)", color:"#fff", border:"none", padding:"18px", borderRadius:14, fontSize:18, fontWeight:700, cursor:"pointer", marginBottom:12 }} onClick={() => onSave(form)}>
 {form.id ? " Enregistrer les modifications" : " Ajouter la villa"}
 </button>
 <button style={{ width:"100%", background:"#f5f5f5", color:"#888", border:"none", padding:"14px", borderRadius:14, fontSize:16, cursor:"pointer" }} onClick={onClose}>
 Annuler
 </button>
 </div>
 );
}
