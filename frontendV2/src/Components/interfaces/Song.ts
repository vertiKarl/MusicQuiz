export class Song {
    constructor(
        public artist: string,
        public title: string,
        public year: number,
        public path: string,
        public game?: string,
        public anime?: string
    ) {}
}