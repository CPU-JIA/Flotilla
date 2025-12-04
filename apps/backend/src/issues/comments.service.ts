/**
 * Issue Comments Service
 *
 * Handles CRUD operations for issue comments
 *
 * ECP-A1: Single Responsibility - Only manages comment operations
 * ECP-C1: Defensive Programming - Validates ownership before update/delete
 * ECP-C2: Systematic Error Handling - All operations with proper error messages
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IssueCreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all comments for an issue
   * @param issueId - Issue ID
   * @returns Array of comments with author information, sorted by creation time (oldest first)
   */
  async findAll(issueId: string) {
    return this.prisma.issueComment.findMany({
      where: { issueId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new comment
   * @param issueId - Issue ID
   * @param authorId - Comment author ID
   * @param createCommentDto - Comment data
   * @returns Created comment with author information
   */
  async create(
    issueId: string,
    authorId: string,
    createCommentDto: IssueCreateCommentDto,
  ) {
    // ECP-C1: Verify issue exists
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    return this.prisma.issueComment.create({
      data: {
        issueId,
        authorId,
        body: createCommentDto.body,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Update a comment
   * @param commentId - Comment ID
   * @param userId - Current user ID
   * @param updateCommentDto - Updated comment data
   * @returns Updated comment
   */
  async update(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ) {
    // ECP-C1: Verify comment exists
    const comment = await this.prisma.issueComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // ECP-C1: Verify ownership - only author can update
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.issueComment.update({
      where: { id: commentId },
      data: { body: updateCommentDto.body },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Delete a comment
   * @param commentId - Comment ID
   * @param userId - Current user ID
   */
  async remove(commentId: string, userId: string) {
    // ECP-C1: Verify comment exists
    const comment = await this.prisma.issueComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // ECP-C1: Verify ownership - only author can delete
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.issueComment.delete({
      where: { id: commentId },
    });
  }
}
