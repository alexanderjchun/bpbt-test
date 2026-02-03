# Bobu 2026

[DGTL's posts](https://x.com/search?q=from%3Adgtlemissions%20sake%20and%20a%20dream&src=typed_query)
[The Way of Code](https://www.thewayofcode.com/)

## TODO

- [ ] Finalize content
  - [ ] Sake and a Dream
  - [ ] Who is Bobu?
  - [ ] Proposals
    - [ ] Overview
  - [ ] Brand
- [ ] Get links figure out first
- [ ] Fix nav

### Sake and a Dream

---

- [x] Go through each file and figure out what needs to be done
  - [x] Skills
    - [x] <https://github.com/trailofbits/skills/tree/main/plugins>
  - [ ] PBT
    - [ ] Android/iOS/Desktop
    - [ ] Figure out envs
  - [ ] Morphing States from libhalo (Android/Mobile/Desktop/iOS)
  - [ ] Gallery
  - [ ] Foundry
  - [ ] Optimize images
  - [ ] Hunt & EV component
  - [ ] Drawer/Gallery/Error States/Android/Mobile
  - [ ] Go over Foundry
  - [ ] Refactor components, utils, actions, and fix Vaul
- [ ] Create files for posts
- [ ] Remove Foundry out of `.gitignore`

### Bobu

- [ ] About
- [ ] Proposal form
- [ ] Feedback form
- [ ] FAQ

## Posts

1. Announcement
   - Problems we faced
     - Original intention was flawed
     - Lore blocker
     - X algo changes
     - Lack of quality proposals by effective/talented people
     - Lack of documentation and changing of committee members
     - NDAs vs. transparency
   - What's next?
     - Autonomy
     - Treasury management
     - Mission
     - Establishing roles
     - Forum
2. Documentation
   1. Mission
   2. Bobu Committee
   3. Bobu Collective
   4. Proposal Process
      1. Proposal Process Example: Sticker Proposal
      2. What you need before making a proposal
         1. Statement of Work
   5. How to stay in the loop
      - Need better way to let holders know about new proposals
      - Too annoying to learn about new proposals
3. PBT
   1. Scan all chips and export data. Be sure to remember which chips are which. [Bulk scanner](https://bulk.vrfy.ch/)

      ```json
      {
        "0x44c3eb5588d838776db5535d2820f036f93dd0bdaabc9ddb66bb3f1b8265327a": {
          "primaryPublicKeyRaw": "04fe67e0639e5894214c1cfa363ad70ce00589e8136bd587ea02b781139299c5765827aa4b18b291682c84daefab9501118301d01896f74dc2b6c03c3497b6696e",
          "primaryPublicKeyHash": "0x44c3eb5588d838776db5535d2820f036f93dd0bdaabc9ddb66bb3f1b8265327a",
          "secondaryPublicKeyHash": null,
          "tertiaryPublicKeyHash": null,
          "address": "0x20430eE3F71B6ae60Befdb4cd6108e5F37F14CB2",
          "edition_number": 1
        },
        "0x43b8f36f2dc5316b2a4212a9ecb9e34a8d48152101b582621afcc81dd5cb4914": {
          "primaryPublicKeyRaw": "04eb94d5963fb325a7de30e53582e289501121df42d146c1a2b72759ab566da6e7bd706b970f50c46b40d420377c45a4246ba4d17e61ef029ac7b13e4aa84bcbe9",
          "primaryPublicKeyHash": "0x43b8f36f2dc5316b2a4212a9ecb9e34a8d48152101b582621afcc81dd5cb4914",
          "secondaryPublicKeyHash": null,
          "tertiaryPublicKeyHash": null,
          "address": "0x38A8f6EB0c27346a2Af1C84A815EC5A5617f926F",
          "edition_number": 2
        }
      }
      ```

   2. Deploy contract
   3. Build frontend: Web app creates QR code > User scans with mobile > User scans chip > Mobile web app writes the signature to the server while the desktop web app polls the server for the signature > User completes the mint

## Links

- [Bobu Pawn Shop](https://github.com/Halldon-Inc/bobu-pawn-shop/blob/develop/package.json)
- [webtoon](https://www.webtoons.com/p/community/en/u/525th)
- [Foundry](https://book.getfoundry.sh/)
