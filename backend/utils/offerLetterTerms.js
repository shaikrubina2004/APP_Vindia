// ===== FILE: APP_Vindia/backend/utils/offerLetterTerms.js =====
//
// The FIXED wording of the offer letter: company details, the welcome text,
// Annexure 1 notes, Additional Benefits and Annexure 2 (Terms of Employment).
// It is copied from the Vindia Infrasec sample offer letter.
//
// HR / legal can change any sentence here without touching the PDF code
// (backend/utils/offerLetterPdf.js). Restart the backend after editing.
//
// {{NOTICE_WORD}} in a sentence is replaced by the notice period chosen on
// the offer form (for example "Three").

const COMPANY = {
  // Name as it is written inside the letter text.
  letterName: "VIndia Infrasec",
  legalName: "VIndia Infrasec Pvt Ltd",
  division: "DirectCore Division",
  reportingCity: "Bangalore",
  // Shown in the letterhead, top right.
  website: "vindiainfrasec.com",
  addressLines: ["Vindia Infrasec", "Brigade Arcade", "Mahadevapura,Bangalore-560048"],
  phone: "9185 9292 1212",
  // Default for the "Reporting address" field on the offer form.
  officeAddress:
    "VIndia Infrasec, G-23, Brigade Archade, Garudacharapalaya, Mahadevapura",
};

const WELCOME_PARAGRAPHS = [
  "VIndia Infrasec is defined by a strong and intrinsic culture that sets us apart. Our DNA, while evolving through various transformations, has still fundamentally been driven by the same core values. Customer centricity has been one such tenet that influences every VIndian. We strive to understand our customer's need, staying ahead of the curve to deliver best-in-class service. Equally crucial, is our outcome focus, wherein our eyes stay on the end result without compromising on our quality, ethics and people. We draw our greatest strength from our people. Hence, empowering our workforce has gone hand-in-hand with greater accountability, thereby creating responsible citizens of the world. As we redefine what business success means in the changing landscape, we believe in inculcating the spirit of experimentation so that established systems and ways of doing things are constantly tested, questioned and disrupted. Imagination, innovation and the ability to take risks are fundamental characteristics that make us shatter boundaries.",
  "These shared values and beliefs are the influencers of everyday work culture at VIndia Infrasec that has eventually built our ethos. It is what integrates us across technologies, platforms and geographies. We are proud of it and we eagerly welcome you to the VIndia Infrasec way of life.",
];

const BGV_CONTINGENCY =
  "This offer of employment is contingent upon you fulfilling the background verification process that the organization will conduct.";

// Under the salary table
const SALARY_NOTES = [
  "1. As per Statutory regulations, if your covered under Payment of Bonus act, this component will be paid as \"Bonus\" if not will be paid as \"Ex- Gratia\".",
  "2. Variable Pay (if applicable) will be payable on Quarterly basis. Amount shown is payable on 100% Target achievement. The company and unit/function performance achievement against the target measured quarterly shall determine the payout under the Variable Pay Plan. Note: Variable Pay is governed by the provisions of Variable Pay Plan (available on VIndia Infrasec Intranet) and the same will be reviewed from time to time.",
];

const ADDITIONAL_BENEFITS = [
  "Additionally you shall be eligible for gratuity as per the gratuity act, subject to 5 years of continuous employment with the organization.",
  "You are covered under Group Mediclaim Insurance for a sum insured of INR 500,000 per annum. This mandatory coverage also includes your spouse and 2 children. As per the policy, you have an option to enroll your dependents (parents/parents-in-law) by paying additional premium. If you don't want to opt for it, the premium will not be deducted from the salary.",
  "Meal Card: You will be eligible to enroll for a meal allowance of INR 2,200 per month. This is a voluntary option and will be adjusted with your special allowance.",
  "As per the Maternity Benefit (Amendment) Act, 2017, women employees are eligible for Maternity Leave of 26 weeks. Adoption Leave and Paternity Leave are also applicable as the case may be. Please refer to the Company Policy for more details.",
];

const TERMS_INTRO =
  "Your employment at VIndia Infrasec (\"The Company\") will be governed by the Company's policies as modified from time to time. Copy of the present policy will be made available to you on your joining the Company. In particular and without prejudice to the foregoing statement, some of the more significant terms and conditions that govern your employment, subject to modifications from time to time, are detailed below.";

// level 0 = normal clause, level 1 = sub-clause (indented further)
const L0 = (text) => ({ text, level: 0 });
const L1 = (text) => ({ text, level: 1 });

const TERMS = [
  {
    title: "1) Hours of Work",
    items: [
      L0("1.1. A working day shall comprise of nine hours."),
      L0("1.2. You may be required to work on a shift basis. Shifts may be scheduled across 24 hours a day, 7 days a week and 365 days a year, subject to applicable laws. The shift timings may change from time to time which you will be notified of in advance."),
      L0("1.3. At times you may be required to work beyond eight working hours."),
      L0("1.4. Employees at the client site shall follow the working hours as applicable at client site."),
    ],
  },
  {
    title: "2) Place of Employment",
    items: [
      L0("2.1. During your employment with the company, you will be liable to be transferred or deputed to any of the offices, departments of the Company or its Associates, Subsidiaries or Group Companies, whether in India or abroad."),
      L0("2.2. In the event of transfer or deputation of your services your salary and other benefits will be determined in accordance with the Company's policies prevalent at that time"),
    ],
  },
  {
    title: "3) Travel",
    items: [
      L0("You may be required to travel, whether in India or overseas, in connection with office work at short notice."),
    ],
  },
  {
    title: "4) Salary and Benefits",
    items: [
      L0("4.1. Salary shall be reviewed on an annual basis depending on the date of joining and you shall be notified of the amount of your salary entitlement for the succeeding year, depending upon your performance during the year."),
      L0("4.2. Notwithstanding the provisions of Clause 4.1, you acknowledge that it is the Company policy to review the salary payable to its employees for successive financial years and such reviewed salary may be higher or lower than the salary received for the previous financial year depending upon the overall performance of the Company."),
      L0("4.3. In addition to salary, you shall also be entitled to receive other benefits as applicable under the Company policy. The Company shall, in its sole discretion, be entitled to amend, vary, and modify any of the terms and conditions of the policy with regard to the benefits that are offered to you."),
    ],
  },
  {
    title: "5) Relocation:",
    items: [
      L0("5.1. You are eligible for relocation expenses reimbursement as per the company policy. In the event of your separation within 12 months of joining VIndia Infrasec , this amount has to be paid back to the company."),
    ],
  },
  {
    title: "6) Leave Entitlement Policy",
    items: [
      L0("All employees are eligible for an annual paid vacation. Please refer to the employee handbook or contact the HR department for further details regarding the Company's leave and vacation policy."),
    ],
  },
  {
    title: "7) Termination",
    items: [
      L0("7.1. Your employment with the Company is subject to termination on:"),
      L1("7.1.1. {{NOTICE_WORD}} month's prior notice by either side"),
      L0("7.2. The Company reserves the right to, at its sole discretion, substitute the notice period by paying you salary in lieu of the notice period."),
      L0("7.3. For abundant caution, it is hereby clarified that you cannot waive the notice period requirement in the event you wish to terminate your employment with the Company, and that your termination/resignation letter (by whatever name it is called) will be accepted by the Company only on your satisfying the mandatory {{NOTICE_WORD}} months notice period as stated in our Company's HR handbook. Further, till such time as the Company accepts your resignation letter, you will be deemed to be an employee of the Company and the terms and conditions of your employment will still continue to bind you."),
      L0("7.4. The Company shall have the right to terminate your employment immediately without notice or payment in lieu of notice if:"),
      L1("7.4.1. You neglect, refuse, fail or for any reason become unable to perform any of your duties under this agreement or comply with the Company policies and code of conduct; or"),
      L1("7.4.2. You are guilty of any misconduct whether or not in the performance of your duties (including but not limited to being an undischarged insolvent, being convicted by any criminal court, being involved in fraudulent acts, etc.) or commit any act which in the opinion of the Company is likely to bring the Company any disrepute whether or not such act is directly related to the affairs of the Company; or"),
      L1("7.4.3. You commit any breach of any of your duties or obligations under this agreement or the policies of the Company."),
      L1("7.4.4. There is a discrepancy in the copies of the documents/certificates given by you as a proof in support of the information provided by you. In the event of termination under Clause 7.4.2, you shall not be entitled to any benefits whatsoever 7.4.3. You commit any breach of any of your duties or obligations under this agreement or the policies of the Company."),
    ],
  },
  {
    title: "8) Mode of Communication",
    items: [
      L0("For any service of notice or communications of any kind, you will be informed by email or ordinary post at the address given by you at the time of your employment or such other address as may be intimated by you to the management thereafter."),
    ],
  },
  {
    title: "9) Confidentiality",
    items: [
      L0("9.1. You agree at all times during the term of your employment and thereafter (Without limit of time);"),
      L1("9.1.1. To hold the Confidential Information in strictest confidence, and not to use or attempt to use the same, except for the benefit of the Company, and"),
      L1("9.1.2. Not to disclose or divulge the Confidential Information to any person or entity without written authorization of the Company."),
      L1("9.1.3. You agree to return to VIndia Infrasec all proprietary information, including copies on paper, hard drive, disk, tape and other media, upon completion or termination of any project or upon cessation of your employment with VIndia Infrasec IT Services."),
      L0("9.2. For the purposes of Clause 9.1., \"Confidential Information\" means any Company proprietary or confidential information, technical data, trade secrets or know-how, whether (oral or written or in electronic format and whether marked confidential or not), including but not limited to; research, business plans, products, product improvements, processes and process documents, services, projects, proposals, all work produced by you whether during normal working hours or not, computer program, documentation, customer lists and customers (including, but not limited to, customers of the Company with whom you become acquainted), markets, software, developments, inventions processes, formulas, technology, designs, drawings, engineering, marketing, distribution and sales methods, sales and profit figures, finances, techniques, strategies, discoveries, the title and description of any patents or patent applications filed by the Company in any country or jurisdiction (until the same is generally available to the public), and any other business information of the Company including its business plans, practice methodologies and technologies (including computer software), training materials, personnel information, client lists and information regarding the business needs, strategies and technologies of present and prospective clients and internal Company publications, whether directly or indirectly, or by drawings or inspection of documents or other tangible property and all information that comes to your knowledge which would but for this employment would not have been accessed by you, whether such information is in tangible form or not, written or otherwise and formal or not. Confidential Information however shall not include knowledge, skills, or information which is common to the business of the Company, or which is generally known outside the Company."),
      L0("9.3. You understand that retaining the confidential nature of the confidential information is of utmost importance to the business of the Company and in addition to the terms stipulated in this agreement herein you agree to execute a Non Disclosure Agreement with the company."),
    ],
  },
  {
    title: "10) Intellectual Property",
    items: [
      L0("10.1. You agree that any proprietary rights whatsoever, including but not limited to, patents, copyright and design rights as a result of the development of and/or the application of all work produced by you during or as a consequence of your employment, whether alone or in conjunction with others and whether during normal working hours or not, including but not limited to any invention, design, discovery or improvement, computer program, documentation, confidential information, copyright work or other material which you conceive, discover or create during or in consequence of this employment with the Company shall belong to the Company absolutely."),
      L0("10.2. You agree, at the Company's expense, to provide, during and after this employment, all such assistance as the Company reasonably considers necessary, to secure the vesting of such rights in the Company or Terms of Employment VIndia Infrasec its nominees (including waiver of any such rights including author's special rights under Section 57 of the Copyright Act 1957)."),
    ],
  },
  {
    title: "11) Data Privacy Compliance Policy",
    items: [
      L0("You consent to the terms and conditions of the Data Privacy Compliance Policy stated below: -"),
      L0("11.1. You consent to the processing of your personal data in accordance with the Company data privacy policy (the \"Policy\"), a copy of which can be obtained upon request;"),
      L0("11.2. In particular, you explicitly consent to:"),
      L1("\u2022 The collection and processing of sensitive personal data about you to the limited extent and for the purposes described in the Policy;"),
      L1("\u2022 The transfer worldwide of personal data held about you by the Company to other employees and offices of the Company's worldwide organization and to third parties where disclosure to such third parties is required in the normal course of business or by law; and use of your personal images and voices in marketing material, videos, etc."),
      L0("11.3. The reference to information \"about you\" includes reference to information about third parties, such as spouse and children (if any), which are provided to the Company by you on their behalf. The reference to \"sensitive personal Data\" may be understood to include reference to the various categories of personal data identified by European and Other applicable data privacy laws as requiring special treatment, including in some circumstances, the need to obtain explicit consent. These categories comprise personal data about racial or ethnic origin, political opinions, religious or other similar beliefs, trade union membership, physical or mental health, sexual life or criminal record."),
      L0("11.3. In addition, you agree to treat any personal data to which you have access in the course of your employment strictly in accordance with this Policy and other Company policies and procedures. In particular, you will not use any such data other than in connection with and to the extent necessary for the purposes of your employment."),
    ],
  },
  {
    title: "12) Non-Compete",
    items: [
      L0("You will certify to maintain Customer exclusivity and to this end, during the validity of this agreement and for a minimum of 2 years thereafter, you shall neither solicit business nor offer product/services and/or conduct any business, that directly competes with the kind of product/services that is offered by the Company to such client, either directly or indirectly with any of 'VIndia Infrasec , client or any third party exposed to you,. In case you violate this provision, a minimum amount of Rs.3 lakhs shall be payable by you to VIndia Infrasec as damages."),
    ],
  },
  {
    title: "13) Non Solicitation of Employees and Clients",
    items: [
      L0("You agree that during the period of your employment with the Company, and for one year after the date of termination of such employment (regardless of whether this cessation of employment is voluntary or involuntary, or caused by the breach of this Agreement by either party), other than on behalf of the Company, you will not, either directly or indirectly:"),
      L1("(A) solicit, divert, take away, hire, or recruit, or attempt to solicit, divert, take away, hire,or recruit, any employee of the Company; or"),
      L1("(B) solicit, divert, take away, hire, or recruit, or attempt to solicit, divert, take away, hire,or recruit, the business of any client, customer, potential client, potential customer, person, or entity with whom Employee had dealings as an Employee of the Company for any purpose related in any manner to the business of the Company."),
      L1("(C) You agree the foregoing restrictions are reasonable both as to time and extent given the nature and scope of the Company's present business and the duties of your employment."),
    ],
  },
  {
    title: "14) Warranty",
    items: [
      L0("14.1. You warrant that your joining the Company will not violate any agreement to which you are or have been a party to."),
      L0("14.2. You warrant that you will not use or disclose any confidential or proprietary information obtained from a third party prior to your employment with the Company."),
      L0("14.3. You warrant that you will comply with all VIndia Infrasec applicable policies and standards and shall perform your services in a manner consistent with the ethical and professional standards of VIndia Infrasec ."),
      L0("14.4. You warrant that you possess all the requisite certificates, licenses, permits, work visas, clearances to be able to lawfully perform the services."),
    ],
  },
  {
    title: "15) Indemnification",
    items: [
      L0("You agree to indemnify the Company for any losses or damages sustained by the Company caused by or related to your breach of any of the provisions contained in this Terms of Employment"),
    ],
  },
  {
    title: "16) Retirement",
    items: [
      L0("Your age of retirement from the service will be on completion of sixty years. However, you may opt for voluntary retirement at any age before sixty years during your services in the establishment if you are unable to continue in service satisfactorily. The actual date of retirement shall be the last working day of the calendar month in which your 60th birthday falls."),
    ],
  },
  {
    title: "17) General",
    items: [
      L0("17.1. This agreement contains the entire agreement between the employee and VIndia Infrasec , and no alteration or variations of the terms of this agreement shall be valid unless made in writing and signed by both the parties here to. This agreement supersedes any prior agreements or understandings between the parties relating to the matter of proprietary rights and / or non disclosure"),
      L0("17.2. This agreement is made under and shall be construed according to the laws of India. Employee agrees to submit to the jurisdiction of the courts of Bangalore (Karnataka)."),
      L0("17.3. This agreement shall remain current and in force, irrespective of whether you are under employment of VIndia Infrasec or not."),
      L0("17.4. Should any part of this agreement be declared illegal or unenforceable, the parties hereto will co-operate in all ways open to them to obtain substantially the same result or as much thereof as may be possible, including taking appropriate steps to amend, modify or alter this agreement. If any term or provision of this Agreement shall be hereafter declared by a final adjudication of any tribunal or court of competent jurisdiction to be illegal, such adjudication shall not alter the validity or enforceability of any other term or provision unless the terms and provisions so declared are expressly defined as a conditions precedent or as of the essence of this agreement, or comprising an integral part of, or inseparable from the remainder of this agreement"),
    ],
  },
  {
    title: "18) Background Verification Clause",
    items: [
      L0("We are considering all the details given by you in your resume and references provided are to the best of your knowledge."),
      L0("This offer letter can be withdrawn anytime if any of the details provided in the resume or reference check happens to be negative."),
    ],
  },
];

const ACK_TITLE = "Acknowledgement and Acceptance of Appointment with VIndia Infrasec";
const ACK_TEXT =
  "have read and understood the above terms and conditions governing my employment with the company and hereby accept the above-mentioned appointment in totality.";

module.exports = {
  COMPANY,
  WELCOME_PARAGRAPHS,
  BGV_CONTINGENCY,
  SALARY_NOTES,
  ADDITIONAL_BENEFITS,
  TERMS_INTRO,
  TERMS,
  ACK_TITLE,
  ACK_TEXT,
};