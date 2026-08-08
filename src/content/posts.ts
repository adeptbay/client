/**
 * Blog posts.
 *
 * A typed array rather than an MDX pipeline. MDX is the right answer at
 * fifty posts; at four it is a build dependency, a plugin chain and a
 * second rendering path to maintain, for no gain. The shape below is
 * deliberately MDX-compatible so the migration is mechanical when the
 * volume justifies it.
 *
 * Appendix D.4 template: TL;DR box first (that is what a retrieval
 * engine lifts), then the argument, then a verification date.
 */

export interface PostSection {
  heading: string;
  body: string[];
  list?: string[];
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  readingMinutes: number;
  /** Three bullets, forty words total. This is the citable block. */
  tldr: string[];
  sections: PostSection[];
}

export const posts: Post[] = [
  {
    slug: 'why-these-tools-run-in-your-browser',
    title: 'Why these tools run in your browser, not on our server',
    description:
      'Uploading a file to process it was a workaround for browsers that could not do the work. That constraint ended years ago, and most tool sites have not noticed.',
    published: '2026-08-08',
    updated: '2026-08-08',
    readingMinutes: 5,
    tldr: [
      'Browsers gained WebAssembly, Web Crypto and Canvas — enough to do most file work locally.',
      'Uploading is now a choice, and it costs you privacy and speed while costing the operator money.',
      'You can verify the claim: load a tool page, go offline, and use it.',
    ],
    sections: [
      {
        heading: 'The upload step is a historical accident',
        body: [
          'When online tools first appeared, a browser could not resize an image, read a PDF or compute a SHA-256 hash. There was no other option: send the file to a server, do the work there, send the result back. Every tool site was built that way because every tool site had to be.',
          'That constraint ended. WebAssembly gives near-native speed for image and document libraries. The Web Crypto API provides audited, native hashing. Canvas and OffscreenCanvas handle pixels. File System Access and streams handle large files without loading them into memory whole. The browser you are reading this in can do almost everything a 2015 server did for these tasks.',
          'Most tool sites still upload anyway. Not because they must — because the architecture was set a decade ago and nobody revisited it.',
        ],
      },
      {
        heading: 'What uploading actually costs you',
        body: [
          'A round trip. Your file goes up, waits in a queue, gets processed, comes back down. For a five megabyte PDF on a normal connection that is several seconds of transfer before any work starts. The same job in your browser starts immediately.',
          'A copy of your file on someone else’s disk. However briefly, however well-intentioned the operator, it existed there. It was probably written to temporary storage. It may have passed through a log line. It is now inside the blast radius of any breach that company has.',
          'And it costs the operator real money — bandwidth, storage, compute — which is why so many upload-based tools have aggressive file size limits, daily quotas, sign-up walls and watermarks. Those restrictions are not product decisions. They are what a server bill looks like from the outside.',
        ],
      },
      {
        heading: 'What we do instead',
        body: [
          'Tools marked "Runs in your browser" do the entire job on your device. There is no upload endpoint. There is no file on our servers, because nothing was ever sent. We could not hand over your document if we were asked to.',
          'This also removes the reason for most restrictions. No sign-up, because there is no account to attach usage to. No daily quota, because your run costs us nothing. No file size ceiling beyond what your own machine can hold. No watermark, because there is no upsell to protect.',
        ],
      },
      {
        heading: 'How to check we are telling the truth',
        body: [
          'Do not take our word for it. Open any tool marked as running in your browser. Wait for it to load. Turn off your Wi-Fi, or switch your browser to offline mode in developer tools. Now use the tool.',
          'It works. It works because nothing it needs is on the network. That is a claim you can falsify in about fifteen seconds, which is the only kind of privacy claim worth making.',
        ],
      },
      {
        heading: 'When a server is genuinely necessary',
        body: [
          'Sometimes it is, and pretending otherwise would be the same dishonesty in the opposite direction. Transcoding a two-gigabyte video, running high-accuracy OCR against a large model, or converting an Office document with correct layout fidelity all need more than a browser tab can reasonably provide.',
          'Those tools are labelled on the page. For them, your file is uploaded directly to object storage with a link valid for fifteen minutes, processed, and deleted automatically within two hours by a storage lifecycle rule rather than by a cleanup script that might fail to run. The contents are never logged.',
          'The point is not that servers are bad. The point is that the default should be reversed: do it locally unless there is a specific reason not to, and say which is which on the page.',
        ],
      },
    ],
  },
];

export const getPost = (slug: string): Post | undefined => posts.find((p) => p.slug === slug);
