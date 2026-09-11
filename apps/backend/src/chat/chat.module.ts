import { Module } from '@nestjs/common';
import { RoomModule } from '../room/room.module.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [RoomModule],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
