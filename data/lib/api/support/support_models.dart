import 'package:freezed_annotation/freezed_annotation.dart';

part 'support_models.freezed.dart';

part 'support_models.g.dart';

@freezed
class AddSupportCaseRequest with _$AddSupportCaseRequest {
  const factory AddSupportCaseRequest({
    String? id,
    required String title,
    String? description,
    @Default([]) List<String> attachment_urls,
    required String user_id,
    required DateTime created_at,
  }) = _AddSupportCaseRequest;

  factory AddSupportCaseRequest.fromJson(Map<String, dynamic> json) =>
      _$AddSupportCaseRequestFromJson(json);
}

enum AttachmentUploadStatus {
  uploading,
  uploaded;

  bool get isUploading => this == uploading;

  bool get isUploaded => this == uploaded;
}

@freezed
class Attachment with _$Attachment {
  const factory Attachment({
    required String path,
    String? url,
    @Default('') String name,
    @Default(AttachmentUploadStatus.uploading)
    AttachmentUploadStatus uploadStatus,
  }) = _Attachment;
}
