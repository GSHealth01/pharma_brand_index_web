// Exact wording provided by the client (copied from the mobile app) — do not edit / shorten / correct.

export const EFFECTIVE_DATE = "28.09.2026";

export const ABOUT_QUOTE =
  "“The good physician treats the disease; the great physician treats the patient who has the disease.”";
export const ABOUT_QUOTE_AUTHOR = "— William Osler";

export const ABOUT_PARAGRAPHS: string[] = [
  "The Pharma Brand Index - Sri Lanka is designed as a practical reference guide connecting pharmaceutical knowledge with the brands available in the Sri Lankan market.",
  "Carefully compiled for ease of reference, this guide brings together pharmaceutical products, their generic names, strengths and formulations in one convenient resource.",
  "It is intended to support healthcare professionals in navigating an increasingly diverse pharmaceutical landscape with greater clarity and confidence.",
];

export type LegalItem = { kind: "para" | "bullet"; text: string };
export type LegalSection = { heading?: string; items: LegalItem[] };

const p = (text: string): LegalItem => ({ kind: "para", text });
const b = (text: string): LegalItem => ({ kind: "bullet", text });

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    items: [
      p("George Steuart Health (Pvt) Ltd (“GSH”, “we”, “us” or “our”) respects your privacy and is committed to handling personal information responsibly."),
      p("This Privacy Policy explains how information may be collected, used, stored and protected when you access or use the Pharma Brand Index – Sri Lanka application (“the Application”)."),
    ],
  },
  {
    heading: "1. Information We May Collect",
    items: [
      p("Depending on how the Application is used, we may collect information such as device information, application usage information, technical identifiers, diagnostic information and information voluntarily provided by users."),
      p("We will seek to collect only information reasonably necessary for the operation, security, maintenance and improvement of the Application."),
    ],
  },
  {
    heading: "2. Use of Information",
    items: [
      p("Information collected may be used to:"),
      b("provide and maintain the Application;"),
      b("improve functionality and user experience;"),
      b("monitor performance and security;"),
      b("identify and prevent misuse, unauthorised access or fraudulent activity;"),
      b("respond to enquiries and technical issues; and"),
      b("comply with applicable legal and regulatory obligations."),
      p("We will not use personal information for purposes materially inconsistent with those described in this Policy without appropriate notice or, where required, consent."),
    ],
  },
  {
    heading: "3. Disclosure",
    items: [
      p("We do not sell personal information to third parties. Product information displayed within the Application is sourced from information made available through the official National Medicines Regulatory Authority (NMRA) website. Personal information may be disclosed only where reasonably necessary to service providers assisting us in operating the Application, where required by law or a lawful authority, or where reasonably necessary to protect the rights, property, or security of George Steuart Health (Pvt) Ltd (GSH), the Application, or its users."),
    ],
  },
  {
    heading: "4. Data Security",
    items: [
      p("We take reasonable technical and organisational measures designed to protect information against unauthorised access, alteration, disclosure, loss or misuse. However, no electronic transmission or storage system can be guaranteed to be completely secure."),
    ],
  },
  {
    heading: "5. Retention",
    items: [
      p("Personal information will be retained only for as long as reasonably necessary for the purposes for which it was collected, to maintain legitimate business records, or to comply with applicable legal obligations."),
    ],
  },
  {
    heading: "6. Changes to this Policy",
    items: [
      p("GSH may amend this Privacy Policy from time to time. The updated version will be made available through the Application and will take effect from the stated effective date."),
    ],
  },
  {
    heading: "7. Contact",
    items: [
      p("Questions concerning this Privacy Policy or the handling of personal information may be directed to:"),
      p("George Steuart Health (Pvt) Ltd"),
      p("info@gshealth.lk"),
      p("No. 7E, Postmasters Place, Off-Templers Road,"),
      p("Dehiwala-Mount Lavinia,"),
      p("Sri Lanka."),
    ],
  },
  {
    heading: "INTELLECTUAL PROPERTY NOTICE",
    items: [
      p("The information accessible through this Application may include factual information available from public and regulatory sources. However, the compilation, selection, organisation, arrangement, presentation, database structure, interface, editorial material, design and original content of the Pharma Brand Index are proprietary to and/or protected rights of George Steuart Health (Pvt) Ltd."),
      p("Unauthorised copying, screenshotting, screen recording, extraction, reproduction, redistribution or commercial use of the Application or any substantial portion thereof is prohibited. Access to the Application constitutes a limited permission to use it for its intended reference purpose and does not confer any ownership or licence in the underlying intellectual property."),
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    items: [
      p("These Terms and Conditions govern access to and use of the Pharma Brand Index – Sri Lanka application (“the Application”), operated by George Steuart Health (Pvt) Ltd (“GSH”, “we”, “us” or “our”)."),
      p("By accessing or using the Application, you acknowledge that you have read, understood and agreed to be bound by these Terms. If you do not agree to them, you must not access or use the Application."),
    ],
  },
  {
    heading: "Permitted Use",
    items: [
      p("The Application is provided solely as a reference and information resource for legitimate professional and informational purposes."),
      p("You may access, search and use the information contained within the Application for your own lawful reference. You must not reproduce, republish, distribute, sell, licence, commercially exploit, systematically extract, scrape, download, reproduce or otherwise make available any substantial part of the Application or its contents without the prior written consent of GSH."),
    ],
  },
  {
    heading: "No Unauthorised Distribution",
    items: [
      p("The Application is made available on the basis that its contents are accessed through the Application itself. Users must not circulate, reproduce or redistribute screenshots, screen recordings, extracted databases, copied listings or substantially similar reproductions of the Application or its contents through WhatsApp, email, social media, websites, publications, databases, applications or any other medium without prior written permission from GSH."),
    ],
  },
  {
    heading: "Intellectual Property",
    items: [
      p("All rights, title and interest in and to the Application, including its software, interface, design, structure, organisation, compilation, selection and arrangement of information, editorial content, graphics, logos, branding and other original material, are owned by or licensed to GSH and are protected by applicable intellectual property laws."),
      p("Nothing in these Terms transfers any ownership or intellectual property rights to the user."),
    ],
  },
  {
    heading: "Third-Party and Public Information",
    items: [
      p("Certain underlying pharmaceutical, regulatory or product information may originate from publicly available or third-party sources, including information made available by regulatory authorities. The inclusion of such information does not constitute a representation that GSH owns the underlying factual information itself."),
      p("GSH’s rights extend to its original compilation, selection, organisation, presentation and other protected elements of the Application."),
    ],
  },
  {
    heading: "Changes and Availability",
    items: [
      p("GSH may amend, update, suspend or discontinue any part of the Application without prior notice. We do not guarantee uninterrupted availability or that every item of information will remain available at all times."),
    ],
  },
  {
    heading: "Breach",
    items: [
      p("Any unauthorised use, reproduction, extraction, distribution or commercial exploitation may constitute a breach of these Terms and may give rise to legal remedies available to GSH under applicable law."),
    ],
  },
  {
    heading: "Governing Law",
    items: [
      p("These Terms shall be governed by and construed in accordance with the laws of the Democratic Socialist Republic of Sri Lanka, and the courts of Sri Lanka shall have jurisdiction over matters arising from or in connection with these Terms."),
    ],
  },
];

export const TERMS_FOOTER = "George Steuart Health (Pvt) Ltd reserves all rights not expressly granted herein.";
