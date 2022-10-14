import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    MessageBody,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
} from "@nestjs/websockets";
import { SocketResponse } from "src/interfaces/socketResponse.interface";
import { Server, WebSocket } from "ws";
import { generateID } from "src/helpers/string.helper";

@WebSocketGateway({
    cors: { origin: "*" },
    path: "/ws3",
})
export class SignalGateway implements OnGatewayInit, OnGatewayConnection {
    // @WebSocketServer() server: Server;
    socketConnections: Object = {};

    afterInit() {
        console.log("ws3 initiated");
    }

    async handleConnection(client: WebSocket) {
        const connectionID = generateID(5);

        client.on("message", async (message) => {
            const msg: SocketResponse = JSON.parse(message.toString());
            await this[`handle_${msg.event}`]?.(connectionID, msg, client);
        });

        client.on("close", async (code) => {
            if (!!this.socketConnections.hasOwnProperty(connectionID)) {
                delete this.socketConnections[connectionID];
                console.log("Disconnected:", connectionID);
            } else {
                // TODO
                // connection might be a viewer... we can remove it from the streamer and infom the streamer
                // streamerID must be stored in viewing variable
            }
        });
    }

    async handle_requestStreamerID(connectionID: string, msg: SocketResponse, wsClient: WebSocket): Promise<void> {
        console.log("Streamer Connected:", connectionID);
        this.socketConnections[connectionID] = { ws: wsClient, viewers: {} };
        wsClient.send(JSON.stringify({ event: "streamerID", data: { connectionID } }));
    }

    async handle_requestViewerID(connectionID: string, msg: SocketResponse, wsClient: WebSocket): Promise<void> {
        if (!this.socketConnections.hasOwnProperty(msg.data.streamerID)) {
            console.error("invalidStreamerID", msg.data.streamerID);
            wsClient.send(JSON.stringify({ event: "invalidStreamerID" }));
            return;
        }
        console.log("Viewer Connected:", connectionID);
        this.socketConnections[msg.data.streamerID].viewers[connectionID] = { ws: wsClient };
        // give the viewer their connectionID
        wsClient.send(JSON.stringify({ event: "viewerID", data: { connectionID } }));
        // tell the streamer that a viewer joined
        this.socketConnections[msg.data.streamerID].ws.send(JSON.stringify({ event: "newViewer", data: { viewerID: connectionID } }));
    }

    async handle_sendStream(connectionID: string, msg: SocketResponse, wsClient: WebSocket): Promise<void> {
        // find the new viewer and deliver the streamer offer to them
        if (!this.socketConnections.hasOwnProperty(connectionID)) return;
        if (!this.socketConnections[connectionID].viewers.hasOwnProperty(msg.data.viewerID)) return;
        this.socketConnections[connectionID].viewers[msg.data.viewerID].ws.send(
            JSON.stringify({ event: "incomingOffer", data: { streamerID: connectionID, offer: msg.data.offer } }),
        );
    }

    async handle_updateOfferCandidates(connectionID: string, msg: SocketResponse, wsClient: WebSocket): Promise<void> {
        // find the viewer and send them an ice
        if (!this.socketConnections.hasOwnProperty(connectionID)) return;
        if (!this.socketConnections[connectionID].viewers.hasOwnProperty(msg.data.viewerID)) return;
        this.socketConnections[connectionID].viewers[msg.data.viewerID].ws.send(
            JSON.stringify({ event: "iceAnswerCandidate", data: { streamerID: connectionID, offerCandidates: msg.data.offerCandidates } }),
        );
    }

    async handle_receiveStream(connectionID: string, msg: SocketResponse, wsClient: WebSocket): Promise<void> {
        // find the streamer and deliver the viewer answer to them
        if (!this.socketConnections.hasOwnProperty(msg.data.streamerID)) return;
        if (!this.socketConnections[msg.data.streamerID].viewers.hasOwnProperty(connectionID)) return;
        this.socketConnections[msg.data.streamerID].ws.send(JSON.stringify({ event: "incomingAnswer", data: { viewerID: connectionID, answer: msg.data.answer } }));
    }

    async handle_updateAnswerCandidates(connectionID: string, msg: SocketResponse, wsClient: WebSocket): Promise<void> {
        // find the streamer and send them an ice
        if (!this.socketConnections.hasOwnProperty(msg.data.streamerID)) return;
        if (!this.socketConnections[msg.data.streamerID].viewers.hasOwnProperty(connectionID)) return;
        this.socketConnections[msg.data.streamerID].ws.send(
            JSON.stringify({ event: "iceOfferCandidate", data: { viewerID: connectionID, answerCandidates: msg.data.answerCandidates } }),
        );
    }

    // @SubscribeMessage("test")
    // async handleTest(@MessageBody() data: Object, @ConnectedSocket() client: WebSocket): Promise<SocketResponse> {
    //     console.log({ data, client });
    //     return { event: "testBack", data: {} };
    // }
}
