import EventEmitter from "events";
import { useRef, Component, createRef, RefObject } from "react";
import { Song } from "./interfaces/Song"

interface State {
    analyzer?: AnalyserNode
    animating: boolean
    audioContext?: AudioContext
    gain?: GainNode
    src?: AudioBufferSourceNode
    isHost: boolean
    events: EventEmitter
}

export default class MediaPlayer extends Component<State> {
    state: State;

    constructor(props: { animating: boolean, isHost: boolean, events: EventEmitter }) {
        super(props);

        this.state = {
            animating: false,
            isHost: props.isHost,
            events: props.events
        }

        this.drawVisualizer = this.drawVisualizer.bind(this);
        this.handleData = this.handleData.bind(this);
        this.handleEvents = this.handleEvents.bind(this);
        this.createAudioContext = this.createAudioContext.bind(this);

        this.handleEvents(this.state.events);
    }

    handleEvents(ev: EventEmitter) {
        ev.on("DATA", (data: ArrayBuffer) => {
            this.handleData(data);
        })

        ev.on("PLAY", (offset?: number) => {
            this.state.src?.start(offset);
        })

        ev.on("STOP", () => {
            this.state.src?.stop(0);
        })

        ev.on("VOLUME", (volume: number) => {
            this.handleVolume(volume);
        })
    }

    handleData(data: ArrayBuffer) {
        if(!this.state.audioContext) return;

        if(!this.state.animating) {
            this.setState({
                animating: true
            })
        }
        console.log("handleData");

        let audio_src = this.state.src;
        if(!audio_src) {
            audio_src = this.state.audioContext.createBufferSource()
        };

        const ctx = this.state.audioContext;
        const gain = this.state.gain;
        const analyzer = this.state.analyzer;

        
        if(!ctx || !gain || !analyzer) return;
        
        
        audio_src = ctx.createBufferSource();
        ctx.decodeAudioData(data, (buffer) => {
            if(buffer.length > 0) {
                audio_src!.buffer = buffer;
                audio_src!.connect(gain);
                
                this.setState({
                    analyzer,
                    src: audio_src
                })
            }
        })

        this.drawVisualizer();
    }

    handleVolume(volume: number) {
        const node = this.state.gain;
        if(!node) return;

        node.gain.value = volume;
    }

    async drawVisualizer() {
        const canvas = document.getElementById('Visualizer');
        if(!canvas || !(canvas instanceof HTMLCanvasElement) || !this.state.analyzer) return;

        const ctx = canvas.getContext("2d");
        if(!ctx) return;

        const data = new Uint8Array(140);
        setTimeout(() => {
            const aniController = window.requestAnimationFrame(this.drawVisualizer);
        }, 1000 / 60) // 60 FPS
        
        this.state.analyzer.getByteFrequencyData(data);
        const bar_width = 3;
        let start = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);


        for(let i = 0; i < data.length; i++) {
            start = i * 4;

            let gradient = ctx.createLinearGradient(
                0, 0, canvas.width, canvas.height
            );

            gradient.addColorStop(0.2, "#2392f5");
            gradient.addColorStop(0.5, "#fe0095");
            gradient.addColorStop(1.0, "purple");

            ctx.fillStyle = gradient;

            ctx.fillRect(start, canvas.height, bar_width, -data[i]*0.5);
        }
    }

    createAudioContext() {
        const ctx = new AudioContext();
        const gain = ctx.createGain();
        const analyzer = ctx.createAnalyser();

        analyzer.connect(ctx.destination);
        gain.connect(analyzer);

        this.setState({
            audioContext: ctx,
            gain,
            analyzer
        });
    }
    
    render() {
        const _s = this.state;

        if(this.state.isHost) {
            const controls = (
            <div>
                <button>p</button>
            </div>
            )
        }

        let audioPerm;

        if(!this.state.audioContext) {
            audioPerm = <button onClick={this.createAudioContext}>Click for audio!</button>
        }

        let lS: JSX.Element | null = null;
    
        //if(_s.lastSong) lS = <p>Last Song: {_s.lastSong.artist} - {_s.lastSong.title}</p>;
        
        return (
        <div className="Display component">
            {audioPerm}
            <canvas
                id="Visualizer"
                width="400px"
                height="120px"
            ></canvas>
            {lS}
        </div>
        )
    }



}