import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  proposalInputSchema,
  proposalStatusUpdateSchema,
  type ProposalInput,
  type ProposalStatusUpdate,
} from '@evomind/contracts';
import { ProposalsService } from './proposals.service';
import { ZodValidationPipe } from './zod-validation.pipe';

const createProposalSchema = proposalInputSchema.refine((input) => input.prototypeUrl.length > 0, {
  path: ['prototypeUrl'],
  message: 'Prototype URL is required',
});

@ApiTags('proposals')
@Controller()
export class ProposalsController {
  constructor(@Inject(ProposalsService) private readonly proposals: ProposalsService) {}

  @Post('tasks/:taskId/proposals')
  @ApiOperation({ summary: 'Submit a team proposal without automatic selection' })
  create(@Param('taskId') taskId: string, @Body(new ZodValidationPipe(createProposalSchema)) input: ProposalInput) {
    return this.proposals.create(taskId, input);
  }

  @Get('tasks/:taskId/proposals')
  @ApiOperation({ summary: 'List proposals for manual comparison' })
  list(@Param('taskId') taskId: string) {
    return this.proposals.list(taskId);
  }

  @Patch('proposals/:id/status')
  @ApiOperation({ summary: 'Manually accept or reject one proposal' })
  updateStatus(@Param('id') id: string, @Body(new ZodValidationPipe(proposalStatusUpdateSchema)) input: ProposalStatusUpdate) {
    return this.proposals.updateStatus(id, input);
  }
}
